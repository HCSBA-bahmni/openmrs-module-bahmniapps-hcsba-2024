import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "../formDisplayControl/formDisplayControl.scss";
import "./ipsDisplayControl.scss";

import { I18nProvider } from "../../Components/i18n/I18nProvider";
import { FormattedMessage } from "react-intl";
import {
    DataTable,
    TableContainer,
    Table,
    TableHead,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Loading,
    Grid,
    Row,
    Column,
    ComposedModal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    InlineLoading
} from "carbon-components-react";
import { View16, DocumentPdf16 } from "@carbon/icons-react";
import axios from "axios";

/* ===========================
   CONFIG ITI-67/68
   =========================== */
// En producción, usa variables de entorno
const REGIONAL_BASE = "https://10.68.174.206:5000/regional";
const BASIC_USER = "mediator-proxy@openhim.org";
const BASIC_PASS = "Lopior.123";
const BASIC_AUTH =
    "Basic " + (typeof btoa === "function" ? btoa(`${BASIC_USER}:${BASIC_PASS}`) : "");

// Headers con Basic Auth
const buildAuthHeaders = (accept = "application/fhir+json") => ({
    Accept: accept,
    Authorization: BASIC_AUTH
});

// Une base + path cuidando slashes
const joinUrl = (base, path) =>
    `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

// Si attachment.url viene relativo (p.ej. "Bundle/18"), resolver contra REGIONAL_BASE
const resolveRegionalUrl = (maybeRelative) =>
    /^https?:\/\//i.test(String(maybeRelative)) ? maybeRelative : joinUrl(REGIONAL_BASE, maybeRelative);

// ITI-67: GET DocumentReference?patient.identifier=...
const fetchDocumentReferences = async (patientIdentifier) => {
    const q = String(patientIdentifier || "");
    const ensured = q.startsWith("RUN*") ? q : `RUN*${q}`;
    const url = `${REGIONAL_BASE}/DocumentReference?patient.identifier=${encodeURIComponent(ensured)}`;
    try {
        const res = await axios.get(url, { headers: buildAuthHeaders("application/fhir+json") });
        return res.data; // axios ya parsea JSON
    } catch (err) {
        if (err.response) throw new Error(`ITI-67 ${err.response.status} ${err.response.statusText}`);
        throw err;
    }
};

// Normaliza Bundle -> DocumentReference[]
const parseDocRefsFromBundle = (bundle) => {
    if (!bundle || bundle.total === 0) return [];
    return (bundle.entry || [])
        .map((e) => e.resource)
        .filter((r) => r?.resourceType === "DocumentReference");
};

/* ===========================
   Helpers de render FHIR
   =========================== */
const getResource = (bundle, resourceType) =>
    (bundle?.entry || []).map((e) => e.resource).find((r) => r?.resourceType === resourceType) || null;

const safeDiv = (html) => ({ __html: html || "" });

/* ===========================
   COMPONENTE
   =========================== */
export function IpsDisplayControl(props) {
    const { hostData, hostApi, tx } = props;
    const { patientUuid, identifier } = hostData || {};

    const [isLoading, setIsLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState(null);

    // modal state (ITI-68 viewer)
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState(null);
    const [viewerBundle, setViewerBundle] = useState(null);

    /* -------- ITI-67 load -------- */
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (!identifier) {
                    setDocuments([]);
                    return;
                }
                const bundle = await fetchDocumentReferences(identifier);
                const docs = parseDocRefsFromBundle(bundle);
                if (!cancelled) setDocuments(docs);
            } catch (e) {
                console.error("[IPS] ITI-67 error:", e);
                if (!cancelled) setError(e.message || String(e));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [identifier]);

    /* -------- Acciones -------- */
    const handleGenerateIPS = () => {
        if (hostApi?.ipsService?.generateDocument) {
            hostApi.ipsService.generateDocument(patientUuid, identifier);
        } else {
            console.log("Generar IPS (noop):", { patientUuid, identifier });
        }
    };

    // ITI-68: ver documento usando attachment.url (p. ej. "Bundle/18")
    const handleViewDocument = async (doc) => {
        const att = doc?.content?.[0]?.attachment;
        const attachmentUrl = att?.url;
        if (!attachmentUrl) {
            console.warn("[ITI-68] Sin attachment.url en DocumentReference:", doc?.id);
            return;
        }
        const url = resolveRegionalUrl(attachmentUrl);

        // Si es PDF, abrir como binario en nueva pestaña
        if (att?.contentType?.toLowerCase?.().includes("pdf")) {
            try {
                const binRes = await axios.get(url, {
                    headers: buildAuthHeaders("*/*"),
                    responseType: "blob"
                });
                const href = URL.createObjectURL(binRes.data);
                window.open(href, "_blank");
            } catch (err) {
                console.error("[ITI-68] Error abriendo PDF:", err);
            }
            return;
        }

        // Render como Bundle bonito en un modal
        setViewerOpen(true);
        setViewerLoading(true);
        setViewerError(null);
        setViewerBundle(null);
        try {
            const jsonRes = await axios.get(url, {
                headers: buildAuthHeaders("application/fhir+json")
            });
            setViewerBundle(jsonRes.data);
        } catch (err) {
            console.error("[ITI-68] Error cargando Bundle:", err);
            setViewerError(err?.response ? `ITI-68 ${err.response.status} ${err.response.statusText}` : String(err));
        } finally {
            setViewerLoading(false);
        }
    };

    /* -------- Render helpers del modal -------- */
    const renderBundleViewer = (bundle) => {
        if (!bundle) return null;

        const composition = getResource(bundle, "Composition");
        const patient = getResource(bundle, "Patient");
        const title =
            composition?.title ||
            composition?.type?.coding?.[0]?.display ||
            "Clinical Document";

        const timestamp =
            bundle?.timestamp || composition?.date || null;

        const sections = composition?.section || [];

        return (
            <div className="ips-bundle-viewer">
                <div className="bundle-header">
                    <h3 className="bundle-title">{title}</h3>
                    {timestamp && (
                        <div className="bundle-meta">
                            <small>
                                <FormattedMessage id="DOC_DATE" defaultMessage="Date" />:{" "}
                                {new Date(timestamp).toLocaleString()}
                            </small>
                        </div>
                    )}
                </div>

                {/* Patient */}
                <div className="bundle-block">
                    <h4><FormattedMessage id="PATIENT" defaultMessage="Patient" /></h4>
                    {patient?.text?.div ? (
                        <div
                            className="bundle-html"
                            dangerouslySetInnerHTML={safeDiv(patient.text.div)}
                        />
                    ) : (
                        <div className="bundle-fallback">
                            <div><b>ID:</b> {patient?.id || "—"}</div>
                            <div><b>Identifier:</b> {patient?.identifier?.[0]?.value || "—"}</div>
                            <div><b>Name:</b> {patient?.name?.[0]?.text || "—"}</div>
                        </div>
                    )}
                </div>

                {/* Sections */}
                {sections.map((sec, i) => (
                    <div key={i} className="bundle-block">
                        <h4>{sec.title || sec.code?.coding?.[0]?.display || `Section ${i + 1}`}</h4>
                        {sec.text?.div ? (
                            <div
                                className="bundle-html"
                                dangerouslySetInnerHTML={safeDiv(sec.text.div)}
                            />
                        ) : (
                            <ul className="bundle-list">
                                {(sec.entry || []).map((ref, k) => (
                                    <li key={k}>{ref.reference}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* -------- UI principal -------- */
    const formsHeading = (
        <FormattedMessage id="DASHBOARD_TITLE_IPS_LAC_KEY" defaultMessage="IPS LAC Dashboard" />
    );

    if (isLoading) {
        return (
            <I18nProvider>
                <div className="ips-display-control-loading">
                    <Loading
                        description={<FormattedMessage id="LOADING_MESSAGE" defaultMessage="Loading... Please Wait" />}
                    />
                </div>
            </I18nProvider>
        );
    }

    if (error) {
        return (
            <I18nProvider>
                <div className="ips-display-control-error">
                    <FormattedMessage
                        id="IPS_ERROR_MESSAGE"
                        defaultMessage="Error loading IPS data: {error}"
                        values={{ error }}
                    />
                </div>
            </I18nProvider>
        );
    }

    return (
        <I18nProvider>
            <div className="ips-display-control">
                {/* Header */}
                <div className="ips-header">
                    <h2 className={"forms-display-control-section-title"}>{formsHeading}</h2>
                    <Button kind="primary" renderIcon={DocumentPdf16} onClick={handleGenerateIPS}>
                        <FormattedMessage id="GENERATE_IPS_DOCUMENT" defaultMessage="Generate IPS Document" />
                    </Button>
                </div>

                <Grid>
                    {/* DocumentReference (ITI-67) */}
                    <Row>
                        <Column lg={12}>
                            <div className="ips-section">
                                <h3>
                                    <FormattedMessage id="IPS_DOCREF_TITLE" defaultMessage="Clinical Documents (ITI-67)" />
                                </h3>

                                {documents.length === 0 ? (
                                    <p className="empty-message">
                                        <FormattedMessage id="NO_DOCREF" defaultMessage="No documents found" />
                                    </p>
                                ) : (
                                    <DataTable
                                        rows={documents.map((doc, idx) => ({
                                            id: doc.id || String(idx),
                                            type:
                                                doc.type?.text ||
                                                doc.type?.coding?.[0]?.display ||
                                                doc.type?.coding?.[0]?.code ||
                                                "—",
                                            date: doc.date ? new Date(doc.date).toLocaleString() : "—",
                                            status: doc.status || "—",
                                            actions: "view"
                                        }))}
                                        headers={[
                                            { key: "type", header: tx?.("DOC_TYPE") || "Type" },
                                            { key: "date", header: tx?.("DATE") || "Date" },
                                            { key: "status", header: tx?.("STATUS") || "Status" },
                                            { key: "actions", header: tx?.("ACTIONS") || "Actions" }
                                        ]}
                                    >
                                        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                                            <TableContainer>
                                                <Table {...getTableProps()}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {headers.map((h) => (
                                                                <TableHeader {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {rows.map((row) => {
                                                            const docForRow =
                                                                documents.find((d) => (d.id || "") === row.id) || null;
                                                            const canView = !!docForRow?.content?.[0]?.attachment?.url;

                                                            return (
                                                                <TableRow {...getRowProps({ row })}>
                                                                    {row.cells.map((cell) => {
                                                                        if (cell.info.header !== "actions") {
                                                                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                                                                        }
                                                                        return (
                                                                            <TableCell key={cell.id}>
                                                                                <Button
                                                                                    kind="ghost"
                                                                                    size="sm"
                                                                                    renderIcon={View16}
                                                                                    disabled={!canView}
                                                                                    onClick={() => docForRow && handleViewDocument(docForRow)}
                                                                                >
                                                                                    <FormattedMessage id="VIEW_DOC" defaultMessage="Ver doc" />
                                                                                </Button>
                                                                            </TableCell>
                                                                        );
                                                                    })}
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </DataTable>
                                )}
                            </div>
                        </Column>
                    </Row>
                </Grid>

                {/* Modal Viewer ITI-68 */}
                <ComposedModal
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    size="lg"
                    className="custom-wide-modal"
                >
                    <ModalHeader
                        label="ITI-68"
                        title={tx?.("DOC_VIEWER") || "Visor de Documento"}
                    />
                    <ModalBody hasScrollingContent>
                        {viewerLoading && (
                            <div className="bundle-loading">
                                <InlineLoading description={tx?.("LOADING") || "Cargando documento..."} />
                            </div>
                        )}
                        {!viewerLoading && viewerError && (
                            <div className="bundle-error">
                                <FormattedMessage
                                    id="DOC_VIEWER_ERROR"
                                    defaultMessage="No se pudo cargar el documento: {error}"
                                    values={{ error: viewerError }}
                                />
                            </div>
                        )}
                        {!viewerLoading && !viewerError && viewerBundle && renderBundleViewer(viewerBundle)}
                    </ModalBody>
                    <ModalFooter>
                        <Button kind="secondary" onClick={() => setViewerOpen(false)}>
                            <FormattedMessage id="CLOSE" defaultMessage="Cerrar" />
                        </Button>
                    </ModalFooter>
                </ComposedModal>
            </div>
        </I18nProvider>
    );
}

IpsDisplayControl.propTypes = {
    hostData: PropTypes.shape({
        patientUuid: PropTypes.string.isRequired,
        identifier: PropTypes.string.isRequired
    }).isRequired,
    hostApi: PropTypes.shape({
        ipsService: PropTypes.shape({
            generateDocument: PropTypes.func
        })
    }),
    tx: PropTypes.func
};

IpsDisplayControl.defaultProps = {
    hostData: {
        patientUuid: "",
        identifier: ""
    },
    hostApi: {
        ipsService: {
            generateDocument: () => {}
        }
    },
    tx: (key) => key
};
