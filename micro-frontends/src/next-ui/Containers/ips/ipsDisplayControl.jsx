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
    Column
} from "carbon-components-react";
import { View16, DocumentPdf16 } from "@carbon/icons-react";
import axios from "axios";

/* ===========================
   CONFIG ITI-67/68
   =========================== */
// En producción, mueve estos valores a variables de entorno
const REGIONAL_BASE = "https://10.68.174.206:5000/regional";
const BASIC_USER = "mediator-proxy@openhim.org";
const BASIC_PASS = "Lopior.123";
const BASIC_AUTH = "Basic " + (typeof btoa === "function" ? btoa(`${BASIC_USER}:${BASIC_PASS}`) : "");

// Headers con Basic Auth
const buildAuthHeaders = (accept = "application/fhir+json") => ({
    "Accept": accept,
    "Authorization": BASIC_AUTH
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
        const res = await axios.get(url, {
            headers: buildAuthHeaders("application/fhir+json")
        });
        return res.data; // axios ya parsea JSON
    } catch (err) {
        if (err.response) {
            throw new Error(`ITI-67 ${err.response.status} ${err.response.statusText}`);
        }
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
   COMPONENTE
   =========================== */
export function IpsDisplayControl(props) {
    const { hostData, hostApi, tx } = props; // hostApi se deja por si usas generateDocument
    const { patientUuid, identifier } = hostData || {};

    const [isLoading, setIsLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState(null);

    // Carga ITI-67
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
        return () => { cancelled = true; };
    }, [identifier]);

    // Generar IPS (si lo mantienes en Angular, sino quítalo)
    const handleGenerateIPS = () => {
        if (hostApi?.ipsService?.generateDocument) {
            hostApi.ipsService.generateDocument(patientUuid, identifier);
        } else {
            console.log("Generar IPS (noop):", { patientUuid, identifier });
        }
    };

    // ITI-68: ver documento desde attachment.url
    const handleViewDocument = async (doc) => {
        const att = doc?.content?.[0]?.attachment;
        const attachmentUrl = att?.url;
        if (!attachmentUrl) {
            console.warn("[ITI-68] Sin attachment.url en DocumentReference:", doc?.id);
            return;
        }
        const url = resolveRegionalUrl(attachmentUrl);
        try {
            // Si sabemos el contentType y es PDF, vamos directo a binario
            if (att?.contentType && /pdf/i.test(att.contentType)) {
                const bin = await fetch(url, { headers: buildAuthHeaders("*/*") });
                if (!bin.ok) throw new Error(`ITI-68 ${bin.status} ${bin.statusText}`);
                const blob = await bin.blob();
                const href = URL.createObjectURL(blob);
                window.open(href, "_blank");
                return;
            }

            // 1) Intentar FHIR JSON (Bundle del documento)
            const tryJson = await fetch(url, { headers: buildAuthHeaders("application/fhir+json") });
            if (tryJson.ok) {
                const json = await tryJson.json();
                // Mostrar en nueva pestaña como JSON legible
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                const href = URL.createObjectURL(blob);
                window.open(href, "_blank");
                return;
            }

            // 2) Fallback binario (PDF u otro)
            const tryBin = await fetch(url, { headers: buildAuthHeaders("*/*") });
            if (!tryBin.ok) throw new Error(`ITI-68 ${tryBin.status} ${tryBin.statusText}`);
            const blob = await tryBin.blob();
            const href = URL.createObjectURL(blob);
            window.open(href, "_blank");
        } catch (err) {
            console.error("[ITI-68] Error:", err);
        }
    };

    const formsHeading = (
        <FormattedMessage id="DASHBOARD_TITLE_IPS_LAC_KEY" defaultMessage="IPS LAC Dashboard" />
    );

    if (isLoading) {
        return (
            <I18nProvider>
                <div className="ips-display-control-loading">
                    <Loading
                        description={
                            <FormattedMessage id="LOADING_MESSAGE" defaultMessage="Loading... Please Wait" />
                        }
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
                                    <FormattedMessage
                                        id="IPS_DOCREF_TITLE"
                                        defaultMessage="Clinical Documents (ITI-67)"
                                    />
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
                                            actions: "view",
                                            doc // conservar doc completo para la acción
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
                                                                <TableHeader {...getHeaderProps({ header: h })}>
                                                                    {h.header}
                                                                </TableHeader>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {rows.map((row) => (
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
                                                                                onClick={() => handleViewDocument(row?.original?.doc)}
                                                                            >
                                                                                <FormattedMessage id="VIEW_DOC" defaultMessage="Ver doc" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            </TableRow>
                                                        ))}
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
