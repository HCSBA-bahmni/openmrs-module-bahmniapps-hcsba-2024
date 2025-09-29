import React, {useState, useEffect, useRef} from "react";
import PropTypes from "prop-types";

import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "../formDisplayControl/formDisplayControl.scss";
import "./ipsICVPDisplayControl.scss";

import {I18nProvider} from "../../Components/i18n/I18nProvider";
import {FormattedMessage} from "react-intl";
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
    Pagination,
    TextArea,
} from "carbon-components-react";
import {View16, QrCode32} from "@carbon/icons-react";
import axios from "axios";
import QRCode from "qrcode";

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
   CONFIG VHL (Mediator)
   =========================== */
const VHL_ISSUANCE_URL = "https://10.68.174.206:5000/vhl/_generate";
const VHL_RESOLVE_URL = "https://10.68.174.206:5000/vhl/_resolve";


/* ===========================
   CONFIG ICVP (Mediator)
   =========================== */
// Expuesto por OpenHIM (ajústalo si lo publicas en otro path)
const ICVP_FROM_BUNDLE_URL = "https://10.68.174.206:5000/icvpcert/_from-bundle";

// Perfiles para decidir el flujo
const PROFILE_LAC_BUNDLE   = "http://lacpass.racsel.org/StructureDefinition/lac-bundle";
const PROFILE_LAC_COMP     = "http://lacpass.racsel.org/StructureDefinition/lac-composition";
const PROFILE_ICVP_BUNDLE  = "http://smart.who.int/icvp/StructureDefinition/Bundle-uv-ips-ICVP";



// Headers con Basic Auth (por OpenHIM)
const buildAuthHeaders = (accept = "application/fhir+json") => ({
    Accept: accept,
    Authorization: BASIC_AUTH,
});

// Une base + path cuidando slashes
const joinUrl = (base, path) =>
    `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

// Si attachment.url viene relativo (p.ej. "Bundle/18"), resolver contra REGIONAL_BASE
const resolveRegionalUrl = (maybeRelative) =>
    /^https?:\/\//i.test(String(maybeRelative)) ? maybeRelative : joinUrl(REGIONAL_BASE, maybeRelative);

// ITI-67 vía mediador con _count escalonado (50→100→150→…).
// Repite la misma búsqueda aumentando _count hasta que desaparece el link "next"
// (sin seguir el "next" del servidor FHIR directo).
const fetchDocumentReferences = async (patientIdentifier) => {
    const raw = String(patientIdentifier || "").trim();
    // Si no viene con RUN*, lo agregamos (tu backend lo espera así).
    const ensured = /^RUN\*/i.test(raw) ? raw : `RUN*${raw}`;

    const STEP = 50;        // incremento por iteración
    const MAX_COUNT = 2000; // hard-stop de seguridad
    let bestBundle = null;
    let bestEntries = [];
    let lastLen = 0;
    let stalled = 0;

    for (let count = STEP; count <= MAX_COUNT; count += STEP) {
        const url =
            `${REGIONAL_BASE}/DocumentReference` +
            `?patient.identifier=${encodeURIComponent(ensured)}&_count=${count}`;

        let res;
        try {
            res = await axios.get(url, {headers: buildAuthHeaders("application/fhir+json")});
        } catch (err) {
            // Si falla al principio, propaga el error; si falla en iteraciones posteriores, corta con lo mejor que tengas
            if (count === STEP) {
                if (err.response) throw new Error(`ITI-67 ${err.response.status} ${err.response.statusText}`);
                throw err;
            } else {
                console.warn("[IPS] Error con _count escalonado; se usará el mejor bundle obtenido:", err?.message || err);
                break;
            }
        }

        const bundle = res?.data || {};
        const entries = Array.isArray(bundle.entry) ? bundle.entry : [];
        const currLen = entries.length;

        // Guardamos el bundle más "completo"
        if (currLen > bestEntries.length) {
            bestEntries = entries;
            bestBundle = bundle;
        }

        // ¿Servidor aún publica "next"?
        const links = Array.isArray(bundle.link) ? bundle.link : [];
        const hasNext = links.some((l) => String(l?.relation || "").toLowerCase() === "next");

        // Heurística anti-loop: si no crece, contamos "stalls"
        if (currLen <= lastLen) {
            stalled += 1;
        } else {
            stalled = 0;
        }
        lastLen = currLen;

        // Condiciones de término:
        // 1) no hay next → ya cargamos todo en esta iteración
        // 2) se estancó 2 veces seguidas → probablemente hay un límite de _count del servidor
        if (!hasNext || stalled >= 2) {
            break;
        }
    }

    // Si no hubo bundle válido, devolvemos uno vacío "searchset"
    if (!bestBundle) {
        return {resourceType: "Bundle", type: "searchset", entry: [], total: 0, link: []};
    }

    // Devolvemos un Bundle "fusionado" (metadatos del mejor bundle, entries completas y sin next externo)
    return {
        ...bestBundle,
        entry: bestEntries,
        total: bestEntries.length,
        link: [], // limpiamos links para no tentar al front a seguir paginación del FHIR directo
    };
};

// Normaliza Bundle -> DocumentReference[]
const parseDocRefsFromBundle = (bundle) => {
    if (!bundle || !Array.isArray(bundle.entry) || bundle.entry.length === 0) return [];
    return (bundle.entry || [])
        .map((e) => e.resource)
        .filter((r) => r?.resourceType === "DocumentReference");
};

/* ===========================
   Helpers de render FHIR
   =========================== */
const getResource = (bundle, resourceType) =>
    (bundle?.entry || []).map((e) => e.resource).find((r) => r?.resourceType === resourceType) || null;

const safeDiv = (html) => ({__html: html || ""});

// Perfiles del Bundle
const getBundleProfiles = (bundle) =>
  Array.isArray(bundle?.meta?.profile) ? bundle.meta.profile.map(String) : [];
const hasProfile = (bundle, profileUri) =>
  getBundleProfiles(bundle).includes(profileUri);


/* ===========================
   COMPONENTE
   =========================== */
export function IpsIcvpDisplayControl(props) {
    const {hostData, tx} = props;
    const {identifier} = hostData || {};

    const [isLoading, setIsLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [error, setError] = useState(null);

    // modal (ITI-68 viewer)
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState(null);
    const [viewerBundle, setViewerBundle] = useState(null);

    // paginación
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizes = [10, 20, 50, 100];

    // compartir VHL (emitir HC1 desde un Bundle)
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState(null);
    const [shareText, setShareText] = useState("");         // el "HC1: ..."
    const [shareQrDataUrl, setShareQrDataUrl] = useState(""); // dataURL del QR

    
    // ICVP (generar QR con $icvp por cada Immunization)
    const [icvpLoading, setIcvpLoading] = useState(false);
    const [icvpError, setIcvpError] = useState(null);
    const [icvpResults, setIcvpResults] = useState([]); // [{immunizationId, pngDataUrl, hc1}]

    // Leer VHL (pegar/scannear → resolver → elegir archivo → ver Bundle)
    const [vhlModalOpen, setVhlModalOpen] = useState(false);
    const [vhlInput, setVhlInput] = useState("");           // texto pegado/escaneado (HC1:...)
    const [vhlScanActive, setVhlScanActive] = useState(false);
    const [vhlScanError, setVhlScanError] = useState(null);
    const [resolveLoading, setResolveLoading] = useState(false);
    const [resolveError, setResolveError] = useState(null);
    const [resolveFiles, setResolveFiles] = useState([]);   // [{location, contentType}]
    const scannerRef = useRef(null);

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
                // Orden: más nuevos primero
                const docsSorted = [...docs].sort((a, b) => getDocTimestamp(b) - getDocTimestamp(a));
                if (!cancelled) setDocuments(docsSorted);
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
    const handleOpenVhlReader = () => {
        setVhlModalOpen(true);
        setVhlInput("");
        setVhlScanActive(false);
        setVhlScanError(null);
        setResolveFiles([]);
        setResolveError(null);
        setShareError(null);
    };

    const stopVhlScan = async () => {
        try {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch {}
                try { await scannerRef.current.clear(); } catch {}
            }
        } finally {
            scannerRef.current = null;
            setVhlScanActive(false);
        }
    };

    // Espera a que el contenedor exista y tenga tamaño real (>0)
    const waitRegionReady = async (id, timeoutMs = 4000) => {
        const start = Date.now();
        for (;;) {
            const el = document.getElementById(id);
            if (el) {
                const r = el.getBoundingClientRect();
                if (r.width > 10 && r.height > 10) return el;
            }
            if (Date.now() - start > timeoutMs) throw new Error("QR region no está listo");
            await new Promise(r => setTimeout(r, 60));
        }
    };

    const startVhlScan = async () => {
        setVhlScanError(null);

        // 1) Mostrar el contenedor antes de iniciar
        setVhlScanActive(true);
        try {
            const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

            const id = "vhl-qr-region";
            await waitRegionReady(id); // <-- asegura tamaño

            // Evita arrancar dos veces
            if (scannerRef.current) {
                await stopVhlScan();
            }

            const scanner = new Html5Qrcode(id, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });
            scannerRef.current = scanner;

            // 2) Selecciona cámara estable con getCameras()
            const cams = await Html5Qrcode.getCameras();
            if (!Array.isArray(cams) || cams.length === 0) {
                throw new Error("No se encontraron cámaras disponibles");
            }

            // Preferir trasera si existe
            const back = cams.find(c => /back|rear|environment/i.test(c.label));
            const deviceId = (back || cams[0]).id;

            let consecutiveErrors = 0;
            await scanner.start(
                { deviceId: { exact: deviceId } },
                { fps: 12, qrbox: { width: 260, height: 260 } },
                async (decodedText) => {
                    // Éxito: pegar HC1 y parar
                    setVhlInput(decodedText || "");
                    await stopVhlScan();
                },
                (errMsg) => {
                    consecutiveErrors++;
                    if (consecutiveErrors % 40 === 0) {
                        console.debug("[QR] intentando leer…", errMsg);
                    }
                }
            );
        } catch (e) {
            console.error("[VHL] Error iniciando escáner:", e);
            setVhlScanError(
                e?.message ||
                "No se pudo iniciar la cámara. Revisa permisos y que 'html5-qrcode' esté instalado."
            );
            await stopVhlScan();
        }
    };

    const handleCloseVhlModal = async () => {
        await stopVhlScan();
        setVhlModalOpen(false);
    };

    const handleResolveVHL = async () => {
        try {
            setResolveLoading(true);
            setResolveError(null);
            setResolveFiles([]);
            if (!vhlInput || !/^HC1:/.test(vhlInput.trim())) {
                setResolveError("Pega o escanea un código válido que comience con 'HC1:'.");
                return;
            }

            const resp = await axios.post(
                VHL_RESOLVE_URL,
                {qrCodeContent: vhlInput.trim()},
                {
                    headers: {
                        ...buildAuthHeaders("application/json"),
                        "Content-Type": "application/json",
                    },
                    responseType: "json",
                }
            );

            const files = Array.isArray(resp?.data?.files) ? resp.data.files : [];
            setResolveFiles(files);
            if (files.length === 0) {
                setResolveError("No se encontraron archivos en el manifiesto.");
            }
        } catch (e) {
            console.error("[VHL] Resolve error:", e);
            const msg = e?.response ? `${e.response.status} ${e.response.statusText}` : e?.message || String(e);
            setResolveError(`Error al resolver VHL: ${msg}`);
        } finally {
            setResolveLoading(false);
        }
    };

    // === Helpers para fecha del DocumentReference ===
    const getDocDateISO = (doc) =>
        doc?.date ||
        doc?.indexed ||
        doc?.content?.[0]?.attachment?.creation ||
        doc?.meta?.lastUpdated ||
        null;

    const getDocTimestamp = (doc) => {
        const iso = getDocDateISO(doc);
        const t = iso ? Date.parse(iso) : NaN;
        return Number.isFinite(t) ? t : 0; // sin fecha -> 0 para que vaya al final
    };

    const formatDocDate = (doc) => {
        const iso = getDocDateISO(doc);
        return iso ? new Date(iso).toLocaleString() : "—";
    };

    const openResolvedFile = async (file) => {
        const location = file?.location;
        if (!location) return;
        await stopVhlScan();
        setVhlModalOpen(false);

        setViewerOpen(true);
        setViewerLoading(true);
        setViewerError(null);
        setViewerBundle(null);
        // reset de acciones previas
        setShareLoading(false); setShareError(null); setShareText(""); setShareQrDataUrl("");
        setIcvpLoading(false); setIcvpError(null); setIcvpResults([]);

        try {
            const sameOrigin = String(location).startsWith(REGIONAL_BASE);
            const headers = sameOrigin
              ? buildAuthHeaders("application/fhir+json")
              : { Accept: "application/fhir+json" };
            const res = await axios.get(location, { headers, responseType: "json" });
            setViewerBundle(res.data);
        } catch (e) {
            console.error("[VHL] Error cargando archivo del manifiesto:", e);
            const msg = e?.response ? `${e.response.status} ${e.response.statusText}` : e?.message || String(e);
            setViewerError(`No se pudo cargar el Bundle desde el archivo seleccionado: ${msg}`);
        } finally {
            setViewerLoading(false);
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
                    responseType: "blob",
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
        // reset de acciones previas
        setShareLoading(false); setShareError(null); setShareText(""); setShareQrDataUrl("");
        setIcvpLoading(false); setIcvpError(null); setIcvpResults([]);

        try {
            const jsonRes = await axios.get(url, {
                headers: buildAuthHeaders("application/fhir+json"),
            });
            setViewerBundle(jsonRes.data);
        } catch (err) {
            console.error("[ITI-68] Error cargando Bundle:", err);
            setViewerError(
                err?.response ? `ITI-68 ${err.response.status} ${err.response.statusText}` : String(err)
            );
        } finally {
            setViewerLoading(false);
        }
    };

    /* -------- Render helpers del modal (visor de Bundle) -------- */
    const renderBundleViewer = (bundle) => {
        if (!bundle) return null;
        const isLac  = [PROFILE_LAC_BUNDLE, PROFILE_LAC_COMP]
            .some(p => hasProfile(bundle, p));
        const isIcvp = hasProfile(bundle, PROFILE_ICVP_BUNDLE);

        const composition = getResource(bundle, "Composition");
        const patient = getResource(bundle, "Patient");
        const title =
            composition?.title || composition?.type?.coding?.[0]?.display || "Clinical Document";
        const timestamp = bundle?.timestamp || composition?.date || null;

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

                const resp = await axios.post(
                    VHL_ISSUANCE_URL,
                    viewerBundle, // enviamos el Bundle FHIR puro
                    {
                        headers: {
                            ...buildAuthHeaders("application/json"),
                            "Content-Type": "application/json",
                        },
                        responseType: "json",
                    }
                );

                const hc1 =
                    resp?.data?.hc1
                        ? String(resp.data.hc1).trim()
                        : typeof resp?.data === "string"
                            ? resp.data.trim()
                            : "";

                if (!hc1) {
                    setShareError("El emisor no devolvió un código HC1 válido.");
                    return;
                }

                setShareText(hc1);

                const dataUrl = await QRCode.toDataURL(hc1, {
                    errorCorrectionLevel: "M",
                    margin: 1,
                    scale: 6,
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
            } catch {
                /* noop  */
            }
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
                        flexWrap: "wrap",
                    }}
                >
                    <h3 className="bundle-title" style={{margin: 0}}>
                        {title}
                    </h3>
                    <div style={{display: "flex", gap: "0.5rem", alignItems: "center"}}>
                        {isLac && (
                            <Button kind="primary" size="sm" onClick={handleShareVHL} disabled={shareLoading}>
                              <FormattedMessage id="SHARE_VHL" defaultMessage="Compartir VHL"/>
                            </Button>
                          )}
                          {isIcvp && (
                            <Button kind="primary" size="sm" onClick={handleGenerateICVP} disabled={icvpLoading}>
                              {icvpLoading
                                ? <InlineLoading description={tx?.("GENERATING_ICVP") || "Generando ICVP..."}/>
                                : <FormattedMessage id="GENERATE_ICVP" defaultMessage="Generar ICVP"/>
                              }
                            </Button>
                          )}
                    </div>
                </div>

                {timestamp && (
                    <div className="bundle-meta" style={{marginBottom: "1rem"}}>
                        <small>
                            <FormattedMessage id="DOC_DATE" defaultMessage="Date"/>:{" "}
                            {new Date(timestamp).toLocaleString()}
                        </small>
                    </div>
                )}

                {isLac && (shareLoading || shareError || shareText) && (

                    <div className="vhl-share-block" style={{marginBottom: "1rem"}}>
                        {shareLoading && (
                            <InlineLoading
                                description={tx?.("EMITTING_VHL") || "Emitiendo VHL..."}
                            />
                        )}

                        {!shareLoading && shareError && (
                            <div className="bundle-error" style={{color: "#da1e28"}}>
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
                                    alignItems: "center",
                                }}
                            >
                                {shareQrDataUrl ? (
                                    <img src={shareQrDataUrl} alt="QR VHL" style={{width: 168, height: 168}}/>
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
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        {shareText}
                                    </div>
                                    <Button kind="secondary" size="sm" onClick={handleCopyShareText}>
                                        <FormattedMessage id="COPY_VHL" defaultMessage="Copiar código"/>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Resultados ICVP */}
                {isIcvp && (icvpLoading || icvpError || icvpResults.length > 0) && (
                <div className="icvp-results-block" style={{marginBottom: "1rem"}}>
                    {icvpLoading && (
                    <InlineLoading description={tx?.("GENERATING_ICVP") || "Generando ICVP..."}/>
                    )}
                    {!icvpLoading && icvpError && (
                    <div className="bundle-error" style={{color: "#da1e28"}}>{icvpError}</div>
                    )}
                    {!icvpLoading && !icvpError && icvpResults.length > 0 && (
                    <div style={{display: "grid", gap: "1rem"}}>
                        {icvpResults.map((r, idx) => (
                        <div key={idx} style={{
                            border: "1px solid #e0e0e0",
                            borderRadius: 6,
                            padding: "0.75rem",
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: "1rem",
                            alignItems: "center"
                        }}>
                            {r.pngDataUrl ? (
                            <img src={r.pngDataUrl} alt="QR ICVP" style={{width: 168, height: 168}}/>
                            ) : (
                            <div style={{
                                width: 168, height: 168, display: "grid", placeItems: "center",
                                background: "#f4f4f4", color: "#8d8d8d", fontSize: 12
                            }}>sin imagen</div>
                            )}
                            <div>
                            <div style={{marginBottom: 6}}>
                                <b>Immunization:</b> {r.immunizationId || "—"}
                                {!r.ok && <span style={{color: "#da1e28"}}> (error {r.status})</span>}
                            </div>
                            <div style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                background: "var(--cds-layer, #f4f4f4)",
                                padding: "0.75rem",
                                borderRadius: "0.25rem",
                                fontFamily: "monospace",
                                fontSize: "0.825rem",
                                lineHeight: 1.3,
                                marginBottom: "0.5rem",
                            }}>
                                {r.hc1 || "—"}
                            </div>
                            <Button
                                kind="secondary"
                                size="sm"
                                onClick={async () => { try { await navigator.clipboard.writeText(r.hc1 || ""); } catch {} }}
                                disabled={!r.hc1}
                            >
                                <FormattedMessage id="COPY_HC1" defaultMessage="Copiar HC1"/>
                            </Button>
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </div>
                )}


                {/* Patient */}
                <div className="bundle-block">
                    <h4>
                        <FormattedMessage id="PATIENT" defaultMessage="Patient"/>
                    </h4>
                    {patient?.text?.div ? (
                        <div className="bundle-html" dangerouslySetInnerHTML={safeDiv(patient.text.div)}/>
                    ) : (
                        <div className="bundle-fallback">
                            <div>
                                <b>ID:</b> {patient?.id || "—"}
                            </div>
                            <div>
                                <b>Identifier:</b> {patient?.identifier?.[0]?.value || "—"}
                            </div>
                            <div>
                                <b>Name:</b> {patient?.name?.[0]?.text || "—"}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sections */}
                {(composition?.section || []).map((sec, i) => (
                    <div key={i} className="bundle-block">
                        <h4>{sec.title || sec.code?.coding?.[0]?.display || `Section ${i + 1}`}</h4>
                        {sec.text?.div ? (
                            <div className="bundle-html" dangerouslySetInnerHTML={safeDiv(sec.text.div)}/>
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

    async function handleGenerateICVP() {

    try {
        setIcvpLoading(true);
        setIcvpError(null);
        setIcvpResults([]);

        if (!viewerBundle || viewerBundle.resourceType !== "Bundle" || !viewerBundle.id) {
        setIcvpError("No hay un Bundle válido (con 'id') para generar ICVP.");
        return;
        }

        const resp = await axios.post(
        ICVP_FROM_BUNDLE_URL,
        viewerBundle, // Bundle completo
        {
            headers: {
            ...buildAuthHeaders("application/json"),
            "Content-Type": "application/json",
            },
            responseType: "json",
        }
        );

        const results = Array.isArray(resp?.data?.results) ? resp.data.results : [];
        if (results.length === 0) {
        setIcvpError("La operación ICVP no devolvió resultados.");
        return;
        }

        // Mapear cada resultado a { immunizationId, pngDataUrl, hc1 }
        const mapped = results.map(r => {
        let pngDataUrl = "";
        let hc1 = "";
        try {
            const docRef = r?.data?.entry?.find?.(e => e?.resource?.resourceType === "DocumentReference")?.resource;
            const contents = Array.isArray(docRef?.content) ? docRef.content : [];
            for (const c of contents) {
            const ct = c?.attachment?.contentType || "";
            const data = c?.attachment?.data || "";
            const fmt = c?.format?.code || "";
            if (!data) continue;
            if (/^image\/png$/i.test(ct) || fmt === "image") {
                pngDataUrl = `data:image/png;base64,${data}`;

            } else if (/^text\/plain$/i.test(ct) || fmt === "hc1") {
                let txt = String(data || "");
                if (txt && !/^HC1:/.test(txt) && typeof atob === "function") {
                    try { txt = atob(txt); } catch {}
                }
                hc1 = txt;



            }
            }
        } catch {}
        return {
            immunizationId: r?.immunizationId || "",
            ok: !!r?.ok,
            status: r?.status,
            pngDataUrl,
            hc1,
        };
        });

        setIcvpResults(mapped);
    } catch (e) {
        console.error("[ICVP] Error:", e);
        const msg = e?.response ? `${e.response.status} ${e.response.statusText}` : e?.message || String(e);
        setIcvpError(`Error al generar ICVP: ${msg}`);
    } finally {
        setIcvpLoading(false);
    }
    };







    /* -------- UI principal -------- */
    const formsHeading = (
        <FormattedMessage id="DASHBOARD_TITLE_IPS_ICVP_KEY" defaultMessage="IPS LAC Dashboard"/>
    );

    if (isLoading) {
        return (
            <I18nProvider>
                <div className="ips-display-control-loading">
                    <Loading
                        description={
                            <FormattedMessage id="LOADING_MESSAGE" defaultMessage="Loading... Please Wait"/>
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
                        values={{error}}
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

                    {/* Leer VHL: abre modal para pegar/escanner y resolver */}
                    <Button kind="primary" renderIcon={QrCode32} onClick={handleOpenVhlReader}>
                        <FormattedMessage id="READ_VHL_DOCUMENT" defaultMessage="Leer QR"/>
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
                                        <FormattedMessage id="NO_DOCREF" defaultMessage="No documents found"/>
                                    </p>
                                ) : (
                                    <>
                                        <DataTable
                                            rows={docsPage.map((doc, idx) => ({
                                                id: doc.id || String(start + idx),
                                                type:
                                                    doc.type?.text ||
                                                    doc.type?.coding?.[0]?.display ||
                                                    doc.type?.coding?.[0]?.code ||
                                                    "—",
                                                date: formatDocDate(doc),
                                                status: doc.status || "—",
                                                actions: "view",
                                            }))}
                                            headers={[
                                                {key: "type", header: tx?.("DOC_TYPE") || "Type"},
                                                {key: "date", header: tx?.("DATE") || "Date"},
                                                {key: "status", header: tx?.("STATUS") || "Status"},
                                                {key: "actions", header: tx?.("ACTIONS") || "Actions"},
                                            ]}
                                        >
                                            {({rows, headers, getTableProps, getHeaderProps, getRowProps}) => (
                                                <TableContainer>
                                                    <Table {...getTableProps()}>
                                                        <TableHead>
                                                            <TableRow>
                                                                {headers.map((h) => (
                                                                    <TableHeader {...getHeaderProps({header: h})}>
                                                                        {h.header}
                                                                    </TableHeader>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {rows.map((row, i) => {
                                                                const docForRow = docsPage[i] || null;
                                                                const canView = !!docForRow?.content?.[0]?.attachment?.url;

                                                                return (
                                                                    <TableRow {...getRowProps({row})}>
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
                                                                                        onClick={() =>
                                                                                            docForRow && handleViewDocument(docForRow)
                                                                                        }
                                                                                    >
                                                                                        <FormattedMessage id="VIEW_DOC"
                                                                                                          defaultMessage="Ver doc"/>
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
                                                onChange={({page: p, pageSize: ps}) => {
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

                {/* Modal: Lector VHL (pegar / cámara) */}
                <ComposedModal open={vhlModalOpen} onClose={handleCloseVhlModal} size="lg">
                    <ModalHeader label="VHL" title={tx?.("READ_VHL_DOCUMENT") || "Leer VHL"}/>
                    <ModalBody hasScrollingContent>
                        <div className="vhl-reader" style={{display: "grid", gap: "1rem"}}>
                            <TextArea
                                id="vhl-input"
                                labelText={tx?.("PASTE_VHL_HC1") || "Pega el código VHL (HC1)"}
                                placeholder="HC1:..."
                                rows={4}
                                value={vhlInput}
                                onChange={(e) => setVhlInput(e.target.value)}
                            />

                            {/* Scanner */}
                            <div>
                                <div style={{display: "flex", gap: "0.5rem", alignItems: "center"}}>
                                    <Button
                                        kind={vhlScanActive ? "danger--tertiary" : "tertiary"}
                                        size="sm"
                                        onClick={vhlScanActive ? stopVhlScan : startVhlScan}
                                    >
                                        {vhlScanActive
                                            ? (tx?.("STOP_SCANNING") || "Detener escáner")
                                            : (tx?.("SCAN_QR") || "Escanear QR")}
                                    </Button>
                                    {vhlScanError && (
                                        <span style={{color: "#da1e28", fontSize: 12}}>{vhlScanError}</span>
                                    )}
                                </div>

                                <div
                                    id="vhl-qr-region"
                                    style={{
                                        width: 320,
                                        height: 320,
                                        marginTop: "0.5rem",
                                        background: "#00000010",
                                        position: "relative",
                                        display: vhlScanActive ? "block" : "none",
                                    }}
                                />
                            </div>

                            {/* Resolver */}
                            <div>
                                <Button kind="primary" size="sm" onClick={handleResolveVHL} disabled={resolveLoading}>
                                    {resolveLoading ? (
                                        <InlineLoading
                                            description={tx?.("RESOLVING_VHL") || "Resolviendo VHL..."}
                                        />
                                    ) : (
                                        <FormattedMessage id="RESOLVE_VHL" defaultMessage="Resolver VHL"/>
                                    )}
                                </Button>
                                {resolveError && (
                                    <div style={{color: "#da1e28", marginTop: "0.5rem"}}>{resolveError}</div>
                                )}
                            </div>

                            {/* Archivos del manifiesto */}
                            {resolveFiles.length > 0 && (
                                <div className="manifest-files">
                                    <h4 style={{marginBottom: "0.5rem"}}>
                                        <FormattedMessage id="MANIFEST_FILES" defaultMessage="Archivos disponibles"/>
                                    </h4>
                                    <ul style={{listStyle: "none", padding: 0, margin: 0}}>
                                        {resolveFiles.map((f, idx) => (
                                            <li
                                                key={idx}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    padding: "0.5rem 0",
                                                    borderTop: idx === 0 ? "none" : "1px solid #e0e0e0",
                                                }}
                                            >
                                                <div style={{minWidth: 0}}>
                                                    <div
                                                        style={{
                                                            fontFamily: "monospace",
                                                            fontSize: 12,
                                                            wordBreak: "break-all",
                                                        }}
                                                        title={f.location}
                                                    >
                                                        {f.location}
                                                    </div>
                                                    <small style={{opacity: 0.7}}>
                                                        {f.contentType || "application/fhir+json"}
                                                    </small>
                                                </div>
                                                <div style={{flexShrink: 0}}>
                                                    <Button kind="ghost" size="sm" onClick={() => openResolvedFile(f)}>
                                                        <FormattedMessage id="OPEN" defaultMessage="Abrir"/>
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button kind="secondary" onClick={handleCloseVhlModal}>
                            <FormattedMessage id="CLOSE" defaultMessage="Cerrar"/>
                        </Button>
                    </ModalFooter>
                </ComposedModal>

                {/* Modal Viewer ITI-68 */}
                <ComposedModal
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    size="lg"
                    className="custom-wide-modal"
                >
                    <ModalHeader label="ITI-68" title={tx?.("DOC_VIEWER") || "Visor de Documento"}/>
                    <ModalBody hasScrollingContent>
                        {viewerLoading && (
                            <div className="bundle-loading">
                                <InlineLoading
                                    description={tx?.("LOADING") || "Cargando documento..."}
                                />
                            </div>
                        )}
                        {!viewerLoading && viewerError && (
                            <div className="bundle-error">
                                <FormattedMessage
                                    id="DOC_VIEWER_ERROR"
                                    defaultMessage="No se pudo cargar el documento: {error}"
                                    values={{error: viewerError}}
                                />
                            </div>
                        )}
                        {!viewerLoading && !viewerError && viewerBundle && renderBundleViewer(viewerBundle)}
                    </ModalBody>
                    <ModalFooter>
                        <Button kind="secondary" onClick={() => setViewerOpen(false)}>
                            <FormattedMessage id="CLOSE" defaultMessage="Cerrar"/>
                        </Button>
                    </ModalFooter>
                </ComposedModal>
            </div>
        </I18nProvider>
    );
}

IpsIcvpDisplayControl.propTypes = {
    hostData: PropTypes.shape({
        patientUuid: PropTypes.string.isRequired,
        identifier: PropTypes.string.isRequired,
    }).isRequired,
    hostApi: PropTypes.shape({
        ipsService: PropTypes.shape({
            generateDocument: PropTypes.func,
        }),
    }),
    tx: PropTypes.func,
};

IpsIcvpDisplayControl.defaultProps = {
    hostData: {
        patientUuid: "",
        identifier: "",
    },
    hostApi: {
        ipsService: {
            generateDocument: () => {},
        },
    },
    tx: (key) => key,
};
export default IpsIcvpDisplayControl;