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
    InlineLoading,
    Pagination
} from "carbon-components-react";
import {View16, QrCode32} from "@carbon/icons-react";
import axios from "axios";
import QRCode from 'qrcode';

/* ===========================
   CONFIG ITI-67/68
   =========================== */
// En producción, usa variables de entorno
const REGIONAL_BASE = "https://10.68.174.206:5000/regional";
const BASIC_USER = "mediator-proxy@openhim.org";
const BASIC_PASS = "Lopior.123";
const BASIC_AUTH =
    "Basic " + (typeof btoa === "function" ? btoa(`${BASIC_USER}:${BASIC_PASS}`) : "");
/* ===========================
   CONFIG VHL SHARE (QR)
   =========================== */
const VHL_ISSUANCE_URL = "https://10.68.174.206:5000/vhl/_generate";
const VHL_RESOLVE_URL = "https://10.68.174.206:5000/vhl/_resolve";

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

const fetchIpsJsonUrl = async (hc1) => {
    const resp = await axios.post(
        `${VHL_RESOLVE_URL}?format=text`,
        { qrCodeContent: hc1 },
        {
            headers: {
                ...buildAuthHeaders("text/plain"),
                "Content-Type": "application/json"
            },
            responseType: "text"
        }
    );
    return resp.data.trim(); // p.ej. http://10.68.174.221:8182/v2/ips-json/....?key=...
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
    const { hostData, tx } = props;
    const { identifier } = hostData || {};

    const [isLoading, setIsLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState(null);

    // modal state (ITI-68 viewer)
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState(null);
    const [viewerBundle, setViewerBundle] = useState(null);

    // paginación
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizes = [10, 20, 50, 100];

    // compartir VHL
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState(null);
    const [shareText, setShareText] = useState("");   // el "HC1: ..."
    const [shareQrDataUrl, setShareQrDataUrl] = useState(""); // dataURL del QR


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

    // ajustar página si cambian documentos o pageSize
    useEffect(() => {
        setPage(1);
    }, [documents, pageSize]);

    /* -------- Acciones -------- */
    const handleGenerateIPS = () => {
        console.log("[IPS] Generating IPS document...");
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

        const timestamp = bundle?.timestamp || composition?.date || null;
        const sections = composition?.section || [];

        const handleShareVHL = async () => {
            try {
                setShareLoading(true);
                setShareError(null);
                setShareText("");
                setShareQrDataUrl("");

                if (!viewerBundle) {
                    setShareError("No hay documento cargado para compartir.");
                    return;
                }

                // 👉 IMPORTANTE: Asegúrate que VHL_ISSUANCE_URL apunte al mediator (ej. https://10.68.174.206:5000/vhl/_generate)
                const resp = await axios.post(
                    VHL_ISSUANCE_URL,
                    viewerBundle, // enviamos el Bundle FHIR puro
                    {
                        headers: {
                            ...buildAuthHeaders("application/json"), // Accept + Authorization (Basic)
                            "Content-Type": "application/json"
                        },
                        responseType: "json"
                    }
                );

                const hc1 =
                    resp?.data?.hc1
                        ? String(resp.data.hc1).trim()
                        : (typeof resp?.data === "string" ? resp.data.trim() : "");

                if (!hc1) {
                    setShareError("El emisor no devolvió un código HC1 válido.");
                    return;
                }

                setShareText(hc1);

                // Generamos el QR (import QRCode from "qrcode";)
                const dataUrl = await QRCode.toDataURL(hc1, {
                    errorCorrectionLevel: "M",
                    margin: 1,
                    scale: 6
                });
                setShareQrDataUrl(dataUrl);
            } catch (e) {
                console.error("[VHL] Error al compartir:", e);
                const msg = e?.response
                    ? `${e.response.status} ${e.response.statusText}`
                    : e?.message || String(e);
                setShareError(`Error al emitir VHL: ${msg}`);
            } finally {
                setShareLoading(false);
            }
        };

        const handleCopyShareText = async () => {
            try {
                await navigator.clipboard.writeText(shareText || "");
            } catch { /* noop */ }
        };

        return (
            <div className="ips-bundle-viewer">
                <div
                    className="bundle-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap"
                    }}
                >
                    <h3 className="bundle-title" style={{ margin: 0 }}>{title}</h3>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Button
                            kind="primary"
                            size="sm"
                            onClick={handleShareVHL}
                            disabled={shareLoading}
                        >
                            <FormattedMessage id="SHARE_VHL" defaultMessage="Compartir VHL" />
                        </Button>
                    </div>
                </div>

                {timestamp && (
                    <div className="bundle-meta" style={{ marginBottom: "1rem" }}>
                        <small>
                            <FormattedMessage id="DOC_DATE" defaultMessage="Date" />:{" "}
                            {new Date(timestamp).toLocaleString()}
                        </small>
                    </div>
                )}

                {/* Resultado de compartir VHL */}
                {(shareLoading || shareError || shareText) && (
                    <div className="vhl-share-block" style={{ marginBottom: "1rem" }}>
                        {shareLoading && (
                            <InlineLoading description={tx?.("EMITTING_VHL") || "Emitiendo VHL..."} />
                        )}

                        {!shareLoading && shareError && (
                            <div className="bundle-error" style={{ color: "#da1e28" }}>
                                {shareError}
                            </div>
                        )}

                        {!shareLoading && !shareError && shareText && (
                            <div
                                className="vhl-share-result"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "auto 1fr",
                                    gap: "1rem",
                                    alignItems: "center"
                                }}
                            >
                                {shareQrDataUrl ? (
                                    <img
                                        src={shareQrDataUrl}
                                        alt="QR VHL"
                                        style={{ width: 168, height: 168 }}
                                    />
                                ) : null}
                                <div>
                                    <div
                                        style={{
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            background: "var(--cds-layer, #f4f4f4)",
                                            padding: "0.75rem",
                                            borderRadius: "0.25rem",
                                            fontFamily: "monospace",
                                            fontSize: "0.825rem",
                                            lineHeight: 1.3,
                                            marginBottom: "0.5rem"
                                        }}
                                    >
                                        {shareText}
                                    </div>
                                    <Button kind="secondary" size="sm" onClick={handleCopyShareText}>
                                        <FormattedMessage id="COPY_VHL" defaultMessage="Copiar código" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

    // slice para paginación
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const docsPage = documents.slice(start, end);

    return (
        <I18nProvider>
            <div className="ips-display-control">
                {/* Header */}
                <div className="ips-header">
                    <h2 className={"forms-display-control-section-title"}>{formsHeading}</h2>
                    <Button kind="primary" renderIcon={QrCode32} onClick={handleGenerateIPS}>
                        <FormattedMessage id="READ_VHL_DOCUMENT" defaultMessage="Leer VHL" />
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
                                    <>
                                        <DataTable
                                            rows={docsPage.map((doc, idx) => ({
                                                id: doc.id || String(start + idx), // id estable por página
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
                                                            {rows.map((row, i) => {
                                                                // doc correspondiente en la página actual
                                                                const docForRow = docsPage[i] || null;
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

                                        {/* Paginación */}
                                        <div className="ips-pagination">
                                            <Pagination
                                                page={page}
                                                pageSize={pageSize}
                                                pageSizes={pageSizes}
                                                totalItems={documents.length}
                                                onChange={({ page: p, pageSize: ps }) => {
                                                    setPage(p);
                                                    setPageSize(ps);
                                                }}
                                            />
                                        </div>
                                    </>
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
