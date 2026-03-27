import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
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
  Modal,
  Tabs,
  Tab,

  Tag,
  InlineNotification,
  Pagination,
  Select,
  SelectItem,
} from "carbon-components-react";
import { Share16, Printer16, View16 } from "@carbon/icons-react";
import { dashboardConfig } from "../../config/dashboardConfig";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./AllOrdersDashboard.scss";

// ─── Columnas por tipo de orden ───────────────────────────────────────────────
const LAB_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Examen" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "status", header: "Estado" },
  { key: "actions", header: "Acciones" },
];

const IMAGING_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Estudio" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const MEDICATION_HEADERS = [
  { key: "orderNumber", header: "N° Receta" },
  { key: "drugName", header: "Medicamento" },
  { key: "dosage", header: "Dosis" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const PROCEDURE_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Procedimiento" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const REFERRAL_HEADERS = [
  { key: "orderNumber", header: "N° Derivación" },
  { key: "conceptName", header: "Especialidad" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

// ─── Config de secciones para generación de PDFs ──────────────────────────────
const SECTIONS_CONFIG = {
  laboratory: {
    label: "Órdenes de Laboratorio",
    filePrefix: "Laboratorio",
    headers: ["N° Orden", "Examen", "Fecha", "Profesional", "Estado"],
    widths: [55, "*", 55, "*", 60],
    getRows: (orders) => orders.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer, o.status]),
  },
  imaging: {
    label: "Órdenes de Imagenología",
    filePrefix: "Imagenologia",
    headers: ["N° Orden", "Estudio", "Fecha", "Profesional"],
    widths: [55, "*", 55, "*"],
    getRows: (orders) => orders.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer]),
  },
  medication: {
    label: "Recetas Médicas",
    filePrefix: "Medicamentos",
    headers: ["N° Receta", "Medicamento", "Dosis", "Fecha", "Profesional"],
    widths: [55, "*", "*", 55, "*"],
    getRows: (orders) => orders.map((o) => [o.orderNumber, o.drugName, o.dosage, o.orderDate, o.orderer]),
  },
  procedure: {
    label: "Órdenes de Procedimientos",
    filePrefix: "Procedimientos",
    headers: ["N° Orden", "Procedimiento", "Fecha", "Profesional"],
    widths: [55, "*", 55, "*"],
    getRows: (orders) => orders.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer]),
  },
  referral: {
    label: "Derivaciones",
    filePrefix: "Derivaciones",
    headers: ["N° Derivación", "Especialidad", "Fecha", "Profesional"],
    widths: [62, "*", 55, "*"],
    getRows: (orders) => orders.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer]),
  },
};

// ─── Config dinámica desde formularios Bahmni FormBuilder ────────────────────
// Se construye una vez al cargar el módulo desde dashboardConfig.formSections.
// Para añadir un formulario nuevo basta con agregar una entrada en dashboardConfig.
const buildFormSectionsConfig = () =>
  (dashboardConfig.formSections || []).reduce((acc, fc) => {
    const fields = fc.fields || [];
    acc[fc.key] = {
      label:                  fc.label,
      filePrefix:             fc.filePrefix || fc.key,
      tagColor:               fc.tagColor   || "cyan",
      isFormSection:          true,
      encounterTypeUuid:      fc.encounterTypeUuid      || null,
      // Estrategia B: consulta directa por concepto (no requiere encounterTypeUuid)
      observationConceptUuid: fc.observationConceptUuid || null,
      fields,
      // Headers para Carbon DataTable (incluye columna acciones)
      tableHeaders: [
        ...fields.map((f, i) => ({ key: `f_${i}`, header: f.label })),
        { key: "actions", header: "Acciones" },
      ],
      // Headers para PDF (sin acciones)
      headers: fields.map((f) => f.label),
      widths:  fields.map(() => "*"),
      getRows: (orders) =>
        orders.map((o) => fields.map((_, i) => o[`f_${i}`] ?? "-")),
    };
    return acc;
  }, {});

const FORM_SECTIONS_CONFIG = buildFormSectionsConfig();

// Config completa usada en PDF, correo, render, etc.
const ALL_SECTIONS_CONFIG = { ...SECTIONS_CONFIG, ...FORM_SECTIONS_CONFIG };

// Paginación inicial que incluye secciones fijas + formularios
const PAGINATION_INIT = Object.keys(ALL_SECTIONS_CONFIG).reduce(
  (acc, k) => ({ ...acc, [k]: { page: 1, pageSize: 5 } }),
  {}
);

// ─── Componente Tabla genérica ─────────────────────────────────────────────────
function OrdersTable({ orders, headers, onView, onPrint, pageSize, onPageChange, totalItems, currentPage }) {
  if (orders.length === 0) {
    return (
      <div className="all-orders__empty">
        No hay órdenes registradas para este tipo.
      </div>
    );
  }
  return (
    <>
      <DataTable rows={orders} headers={headers}>
        {({ rows, headers: hdrs, getHeaderProps, getRowProps }) => (
          <Table>
            <TableHead>
              <TableRow>
                {hdrs.map((header) => (
                  <TableHeader key={header.key} {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const order = orders.find((o) => o.id === row.id);
                return (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map((cell) => {
                      if (cell.info.header === "actions") {
                        return (
                          <TableCell key={cell.id}>
                            <Button
                              kind="ghost"
                              size="small"
                              renderIcon={View16}
                              iconDescription="Ver detalle"
                              hasIconOnly
                              onClick={() => onView(order)}
                            />
                            <Button
                              kind="ghost"
                              size="small"
                              renderIcon={Printer16}
                              iconDescription="Imprimir"
                              hasIconOnly
                              onClick={() => onPrint(order)}
                            />
                          </TableCell>
                        );
                      }
                      return <TableCell key={cell.id}>{cell.value}</TableCell>;
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataTable>
      <Pagination
        totalItems={totalItems}
        pageSize={pageSize}
        pageSizes={[5, 10, 20]}
        page={currentPage}
        backwardText="Anterior"
        forwardText="Siguiente"
        itemsPerPageText="Por página"
        onChange={onPageChange}
      />
    </>
  );
}

OrdersTable.propTypes = {
  orders: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  onView: PropTypes.func.isRequired,
  onPrint: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  totalItems: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export function AllOrdersDashboard(props) {
  const { hostData } = props;
  const patient = hostData?.patient;
  const activeVisit = hostData?.activeVisit;
  const provider = hostData?.provider;

  const patientUuid = patient?.uuid;

  // Nombre completo del paciente
  const patientName =
    patient?.person?.display ||
    patient?.display ||
    patient?.name ||
    "Paciente";

  // ── State ──────────────────────────────────────────────────────────────────
  // institution se carga desde OpenMRS (systemsetting/location) y cae al
  // dashboardConfig como fallback si la API no responde.
  const [institution, setInstitution] = useState({ ...dashboardConfig.institution });
  const [allOrdersHistory, setAllOrdersHistory] = useState(() => {
    const base = { laboratory: [], imaging: [], medication: [], procedure: [], referral: [] };
    const formKeys = Object.keys(FORM_SECTIONS_CONFIG).reduce((a, k) => ({ ...a, [k]: [] }), {});
    return { ...base, ...formKeys };
  });
  const [visits, setVisits] = useState([]);
  const [selectedVisitUuid, setSelectedVisitUuid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printingSection, setPrintingSection] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // null = compartir todas las secciones activas | string = compartir solo esa sección
  const [shareSection, setShareSection] = useState(null);
  // patientEmail se carga fetcheando los atributos completos del paciente
  // porque hostData.patient no incluye person.attributes.
  const [patientEmail, setPatientEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'success' | 'error' | null
  const [pagination, setPagination] = useState(PAGINATION_INIT);

  // ── Etiqueta legible para una visita ──────────────────────────────────────
  const formatVisitLabel = (visit) => {
    const date = new Date(visit.startDatetime).toLocaleDateString("es-CL");
    const type = visit.visitType?.display || "Visita";
    const loc  = visit.location?.display ? ` · ${visit.location.display}` : "";
    const open = !visit.stopDatetime ? " (activa)" : "";
    return `${date} — ${type}${loc}${open}`;
  };

  // ── Órdenes filtradas por visita seleccionada (useMemo) ───────────────────
  // Todos los datos históricos viven en allOrdersHistory.
  // allOrders es la vista calculada según la visita elegida.
  const allOrders = useMemo(() => {
    if (!selectedVisitUuid) return allOrdersHistory;
    const visit = visits.find((v) => v.uuid === selectedVisitUuid);
    if (!visit) return allOrdersHistory;

    const start = new Date(visit.startDatetime);
    const end = visit.stopDatetime
      ? new Date(visit.stopDatetime)
      : new Date(8640000000000000);

    const filterByVisit = (orders) =>
      (orders || []).filter((o) => {
        if (o.visitUuid) return o.visitUuid === selectedVisitUuid;
        if (!o._rawDate) return false;
        const d = new Date(o._rawDate);
        return d >= start && d <= end;
      });

    // Aplica el filtro a TODAS las claves (fijas + formularios)
    return Object.keys(allOrdersHistory).reduce((acc, key) => {
      acc[key] = filterByVisit(allOrdersHistory[key]);
      return acc;
    }, {});
  }, [allOrdersHistory, selectedVisitUuid, visits]);

  // ── Carga dinámica de datos de la institución ─────────────────────────────
  // Prioridad:
  //  1. System settings de OpenMRS: clinic.name / clinic.address / clinic.phone / clinic.email
  //  2. Ubicación de login (sessionLocation) → display + atributos de dirección
  //  3. Fallback silencioso: dashboardConfig.institution (ya está en el estado)
  const loadInstitutionData = useCallback(async () => {
    try {
      const credOpts = { credentials: "include", headers: { Accept: "application/json" } };

      // 1. System settings (clinic.*)
      const settingsRes = await fetch(
        "/openmrs/ws/rest/v1/systemsetting?q=clinic&v=custom:(property,value)&limit=30",
        credOpts
      );
      if (settingsRes.ok) {
        const { results = [] } = await settingsRes.json();
        const get = (key) => results.find((s) => s.property === key)?.value || "";

        const name    = get("clinic.name");
        const address = get("clinic.address") || get("clinic.address1");
        const phone   = get("clinic.phone")   || get("clinic.telephoneNumber");
        const email   = get("clinic.email");

        if (name) {
          setInstitution((prev) => ({
            ...prev,
            name,
            ...(address && { address }),
            ...(phone   && { phone }),
            ...(email   && { email }),
          }));
          return; // ← encontrado, no necesitamos el fallback
        }
      }

      // 2. Fallback: sessionLocation (donde inició sesión el usuario)
      const sessionRes = await fetch("/openmrs/ws/rest/v1/session", credOpts);
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        const locUuid = session.sessionLocation?.uuid;
        if (locUuid) {
          const locRes = await fetch(
            `/openmrs/ws/rest/v1/location/${locUuid}` +
            `?v=custom:(display,name,address1,address2,cityVillage,stateProvince,country)`,
            credOpts
          );
          if (locRes.ok) {
            const loc = await locRes.json();
            const locAddress = [loc.address1, loc.address2, loc.cityVillage, loc.stateProvince]
              .filter(Boolean).join(", ");
            setInstitution((prev) => ({
              ...prev,
              name: loc.display || loc.name || prev.name,
              ...(locAddress && { address: locAddress }),
            }));
          }
        }
      }
    } catch (err) {
      // Fallback silencioso: quedan los valores de dashboardConfig.institution
      console.warn("AllOrdersDashboard: no se pudo cargar datos de institución", err);
    }
  }, []);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const loadAllOrders = useCallback(async () => {
    if (!patientUuid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const credOpts = {
        credentials: "include",
        headers: { Accept: "application/json" },
      };

      // 0. Cargar visitas y atributos del paciente en paralelo ─────────────
      const [visitsRes, patientRes] = await Promise.all([
        fetch(
          `/openmrs/ws/rest/v1/visit?patient=${patientUuid}` +
          `&v=custom:(uuid,visitType:(display),startDatetime,stopDatetime,location:(display))` +
          `&limit=30&includeInactive=true`,
          credOpts
        ),
        fetch(
          `/openmrs/ws/rest/v1/patient/${patientUuid}` +
          `?v=custom:(uuid,person:(attributes:(value,attributeType:(display))))`,
          credOpts
        ),
      ]);

      const visitsData = visitsRes.ok
        ? ((await visitsRes.json()).results || []).sort(
            (a, b) => new Date(b.startDatetime) - new Date(a.startDatetime)
          )
        : [];
      setVisits(visitsData);
      if (visitsData.length > 0) {
        setSelectedVisitUuid(visitsData[0].uuid);
      }

      // Extraer email desde los atributos del paciente
      if (patientRes.ok) {
        const patientData = await patientRes.json();
        const attrs = patientData?.person?.attributes || [];
        const emailAttr = attrs.find(
          (a) =>
            a?.attributeType?.display?.toLowerCase() === "email" ||
            a?.attributeType?.display?.toLowerCase() === "correo"
        );
        setPatientEmail(emailAttr?.value || "");
      }

      // 1. Obtener tipos de orden ────────────────────────────────────────────
      const orderTypesRes = await fetch(
        "/openmrs/ws/rest/v1/ordertype?v=custom:(uuid,display)",
        credOpts
      );
      const orderTypes = orderTypesRes.ok
        ? (await orderTypesRes.json()).results || []
        : [];

      // Matching case-insensitive (por si los nombres difieren ligeramente)
      const typeUuid = (name) => {
        const lower = name.toLowerCase();
        const found = orderTypes.find(
          (t) =>
            t.display?.toLowerCase() === lower ||
            t.display?.toLowerCase().includes(lower.split(" ")[0])
        );
        return found?.uuid;
      };

      console.debug(
        "AllOrdersDashboard – tipos disponibles:",
        orderTypes.map((t) => t.display)
      );

      // 2a. Fetch con bahmnicore/orders (API Bahmni específica) ──────────────
      const fetchBahmniOrders = async (orderTypeUuid) => {
        if (!orderTypeUuid) return [];
        const url =
          `/openmrs/ws/rest/v1/bahmnicore/orders` +
          `?patientUuid=${patientUuid}` +
          `&orderTypeUuid=${orderTypeUuid}` +
          `&numberOfVisits=20` +
          `&includeObs=true`;           // ← bahmnicore requiere true
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      // 2b. Fallback: endpoint estándar OpenMRS /order ───────────────────────
      const fetchStandardOrders = async (orderTypeUuid) => {
        if (!orderTypeUuid) return [];
        const url =
          `/openmrs/ws/rest/v1/order` +
          `?patient=${patientUuid}` +
          `&orderType=${orderTypeUuid}` +
          `&v=full&limit=100`;
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
      };

      // Intenta bahmnicore, si devuelve vacío usa estándar OpenMRS
      const fetchOrders = async (orderTypeUuid) => {
        const bahmni = await fetchBahmniOrders(orderTypeUuid);
        if (bahmni.length > 0) return bahmni;
        return fetchStandardOrders(orderTypeUuid);
      };

      // 3. Drug orders ───────────────────────────────────────────────────────
      const fetchDrugOrders = async () => {
        const url =
          `/openmrs/ws/rest/v1/bahmnicore/drugOrders` +
          `?patientUuid=${patientUuid}` +
          `&numberOfVisits=20` +
          `&includeActiveVisit=true`;
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) return data;
        // prescribedAndActive devuelve objeto { visitDate: [orders], ... }
        return Object.values(data).flat();
      };

      // 4. Ejecutar todo en paralelo ─────────────────────────────────────────
      const [labRaw, imagingRaw, procedureRaw, referralRaw, drugRaw] =
        await Promise.all([
          fetchOrders(typeUuid("Lab Order")),
          fetchOrders(typeUuid("Radiology Order")),
          fetchOrders(typeUuid("Procedure Order")),
          fetchOrders(typeUuid("Referral Order")),
          fetchDrugOrders(),
        ]);

      console.debug("AllOrdersDashboard – resultados raw:", {
        lab: labRaw.length,
        imaging: imagingRaw.length,
        procedure: procedureRaw.length,
        referral: referralRaw.length,
        drugs: drugRaw.length,
      });

      // 5. Mappers – soporta formato bahmnicore Y formato estándar OpenMRS ───
      const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString("es-CL") : "-";

      const extractConceptName = (o) =>
        (typeof o.conceptName === "string" ? o.conceptName : null) ||
        o.concept?.display ||
        (typeof o.concept?.name === "string"
          ? o.concept.name
          : o.concept?.name?.display) ||
        "-";

      const extractOrderer = (o) =>
        (typeof o.provider === "string" ? o.provider : null) ||
        o.orderer?.person?.display ||
        o.orderer?.display ||
        "-";

      const mapOrder = (o, i, type, sectionKey) => ({
        id: o.uuid || `${sectionKey}-${i}`,
        orderNumber: o.orderNumber || "-",
        conceptName: extractConceptName(o),
        orderDate: formatDate(o.orderDate || o.dateActivated || o.scheduledDate),
        _rawDate: o.orderDate || o.dateActivated || o.scheduledDate,
        visitUuid: o.encounter?.visit?.uuid || null,
        orderer: extractOrderer(o),
        status: o.urgency || o.action || o.status || "",
        details: "",
        type,
        sectionKey,
      });

      const mapDrugOrder = (o, i) => {
        const dose = o.dosingInstructions?.dose;
        const units = o.dosingInstructions?.doseUnits?.display || "";
        const freq = o.dosingInstructions?.frequency?.display || "";
        const dur = o.duration
          ? `${o.duration} ${o.durationUnits?.display || ""}`.trim()
          : "";
        const dosage =
          [dose != null && `${dose} ${units}`.trim(), freq, dur]
            .filter(Boolean)
            .join(" – ") || "-";
        return {
          id: o.uuid || `med-${i}`,
          orderNumber: o.orderNumber || "-",
          drugName: o.drug?.display || o.drug?.name || o.drugNonCoded || "-",
          dosage,
          orderDate: formatDate(o.dateActivated || o.scheduledDate),
          _rawDate: o.dateActivated || o.scheduledDate,
          visitUuid: o.encounter?.visit?.uuid || null,
          orderer: extractOrderer(o),
          details: o.dosingInstructions?.administrationInstructions || "",
          type: "Medicamento",
          sectionKey: "medication",
        };
      };

      // Mapper para formularios Bahmni (encounter + obs)
      const mapFormEncounter = (enc, fc, i) => {
        const obsMap = {};
        (enc.obs || []).forEach((obs) => {
          const key = obs.concept?.display;
          if (!key) return;
          // valueText → campo libre de texto
          // value.display → obs de tipo coded (lista/catálogo)
          // value (número/string) → numérico, booleano, etc.
          obsMap[key] =
            obs.valueText ??
            (obs.value?.display) ??
            (obs.value != null ? String(obs.value) : "-");
        });
        const row = {
          id: enc.uuid || `${fc.key}-${i}`,
          orderNumber: "-",
          orderDate: formatDate(enc.encounterDatetime),
          _rawDate: enc.encounterDatetime,
          visitUuid: enc.visit?.uuid || null,
          sectionKey: fc.key,
          type: fc.label,
          details: Object.entries(obsMap)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n"),
        };
        // Mapear cada field configurado a f_N en el objeto fila
        (fc.fields || []).forEach((f, idx) => {
          row[`f_${idx}`] =
            f.source === "encounterDate"
              ? formatDate(enc.encounterDatetime)
              : (obsMap[f.conceptDisplay] ?? "-");
        });
        return row;
      };

      // Mapper para formularios basados en un concepto único (observationConceptUuid)
      // Cada obs individual se convierte en una fila de la tabla.
      const mapObsToRow = (obs, fc, i) => {
        const obsValue =
          obs.valueText ??
          obs.value?.display ??
          (obs.value != null ? String(obs.value) : "-");
        const row = {
          id: obs.uuid || `${fc.key}-${i}`,
          orderNumber: "-",
          orderDate: formatDate(obs.obsDatetime || obs.encounter?.encounterDatetime),
          _rawDate:  obs.obsDatetime || obs.encounter?.encounterDatetime,
          visitUuid: obs.encounter?.visit?.uuid || null,
          sectionKey: fc.key,
          type:       fc.label,
          details:    obsValue,
        };
        // Para este tipo de sección todas las columnas no-fecha muestran el valor de la obs
        (fc.fields || []).forEach((f, idx) => {
          row[`f_${idx}`] =
            f.source === "encounterDate"
              ? formatDate(obs.encounter?.encounterDatetime || obs.obsDatetime)
              : obsValue;
        });
        return row;
      };

      // 5b. Formularios Bahmni (en paralelo si hay configurados) ─────────────
      // Soporta dos estrategias según la config:
      //   A) encounterTypeUuid  → query por encounter + extrae obs del mapa (multi-campo)
      //   B) observationConceptUuid → query directo a /obs por concepto (mono-campo / concepto conocido)
      const formResults = await Promise.all(
        Object.entries(FORM_SECTIONS_CONFIG).map(async ([key, cfg]) => {

          // ── Estrategia B: query directo por conceptUuid ───────────────────
          if (cfg.observationConceptUuid) {
            const url =
              `/openmrs/ws/rest/v1/obs` +
              `?patient=${patientUuid}` +
              `&concept=${cfg.observationConceptUuid}` +
              `&v=custom:(uuid,obsDatetime,value,valueText,concept:(display),` +
              `encounter:(uuid,encounterDatetime,` +
              `visit:(uuid,visitType:(display))))` +
              `&limit=100`;
            const res = await fetch(url, credOpts);
            if (!res.ok) return [key, []];
            const obsList = (await res.json()).results || [];
            return [key, obsList.map((obs, i) => mapObsToRow(obs, cfg, i))];
          }

          // ── Estrategia A: query por encounterType ─────────────────────────
          if (!cfg.encounterTypeUuid) return [key, []];
          const url =
            `/openmrs/ws/rest/v1/encounter` +
            `?patient=${patientUuid}` +
            `&encounterType=${cfg.encounterTypeUuid}` +
            `&v=custom:(uuid,encounterDatetime,` +
            `obs:(uuid,concept:(display),value,valueText),` +
            `visit:(uuid,visitType:(display)))` +
            `&limit=100`;
          const res = await fetch(url, credOpts);
          if (!res.ok) return [key, []];
          const encs = (await res.json()).results || [];
          return [key, encs.map((enc, i) => mapFormEncounter(enc, cfg, i))];
        })
      );
      const formOrdersMap = Object.fromEntries(formResults);

      // 6. Actualizar estado ─────────────────────────────────────────────────
      setAllOrdersHistory({
        laboratory: labRaw.map((o, i) => mapOrder(o, i, "Laboratorio",  "laboratory")),
        imaging:    imagingRaw.map((o, i) => mapOrder(o, i, "Imagenología", "imaging")),
        medication: drugRaw.map((o, i) => mapDrugOrder(o, i)),
        procedure:  procedureRaw.map((o, i) => mapOrder(o, i, "Procedimiento", "procedure")),
        referral:   referralRaw.map((o, i) => mapOrder(o, i, "Derivación",   "referral")),
        ...formOrdersMap,   // formularios Bahmni (vacío si no hay configurados)
      });
    } catch (err) {
      console.error("AllOrdersDashboard: error cargando órdenes", err);
      const emptyFormKeys = Object.keys(FORM_SECTIONS_CONFIG).reduce(
        (a, k) => ({ ...a, [k]: [] }), {}
      );
      setAllOrdersHistory({
        laboratory: [], imaging: [], medication: [], procedure: [], referral: [],
        ...emptyFormKeys,
      });
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    loadInstitutionData();
  }, []);

  useEffect(() => {
    setSelectedVisitUuid(null); // resetear al cambiar de paciente
    loadAllOrders();
  }, [patientUuid]);

  // Suma todas las secciones (fijas + formularios)
  const totalOrders = Object.keys(allOrders).reduce(
    (sum, k) => sum + (allOrders[k]?.length || 0), 0
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handlePaginationChange = (type, { page, pageSize }) => {
    setPagination((prev) => ({ ...prev, [type]: { page, pageSize } }));
  };

  // Abre el modal de compartir para una sección específica (key) o para todas (null)
  const handleShareSection = (key) => {
    setShareSection(key);
    setEmailStatus(null);
    setIsShareModalOpen(true);
  };

  const handleVisitChange = (uuid) => {
    setSelectedVisitUuid(uuid || null);
    setPagination(PAGINATION_INIT);
  };

  const paginatedOrders = (type) => {
    const { page, pageSize } = pagination[type];
    const start = (page - 1) * pageSize;
    return allOrders[type].slice(start, start + pageSize);
  };


  // ── Generación de PDF para UNA sección ────────────────────────────────────
  // overrideOrders: si se pasa, usa ese array en lugar de allOrders[sectionKey].
  // Permite generar el PDF de una sola fila pasando [order].
  const generateSectionPdfBase64 = useCallback(
    (sectionKey, overrideOrders) => {
      return new Promise((resolve, reject) => {
        try {
          const cfg = ALL_SECTIONS_CONFIG[sectionKey];
          const orders = overrideOrders !== undefined
            ? overrideOrders
            : allOrders[sectionKey];
          // institution viene del estado (cargado dinámicamente desde OpenMRS)
          const today = new Date().toLocaleDateString("es-CL");
          const providerName = provider?.person?.display || provider?.display || "";

          const C_BLUE       = "#1e40af";
          const C_BLUE_LIGHT = "#dbeafe";
          const C_BLUE_BDR   = "#bfdbfe";
          const C_ALT_ROW    = "#f0f5ff";
          const C_GRAY       = "#555555";
          const C_BORDER     = "#d1d5db";
          const LINE_W       = 515;

          const tableLayouts = {
            ordersLayout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: (i) => (i === 1 ? C_BLUE_BDR : C_BORDER),
              vLineColor: () => C_BORDER,
              paddingLeft:   () => 3,
              paddingRight:  () => 3,
              paddingTop:    () => 2,
              paddingBottom: () => 2,
            },
            patientLayout: {
              hLineWidth: () => 0.5,
              vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.5 : 0),
              hLineColor: () => C_BLUE_BDR,
              vLineColor: () => C_BLUE_BDR,
              paddingLeft:   () => 5,
              paddingRight:  () => 5,
              paddingTop:    () => 4,
              paddingBottom: () => 4,
            },
          };

          const content = [];

          // Cabecera institucional
          content.push({
            columns: [
              {
                width: "*",
                stack: [
                  { text: institution.name, fontSize: 13, bold: true, color: C_BLUE },
                  { text: institution.address, fontSize: 8.5, color: C_GRAY, margin: [0, 2, 0, 0] },
                  { text: `${institution.phone}  |  ${institution.email}`, fontSize: 8.5, color: C_GRAY, margin: [0, 1, 0, 0] },
                ],
              },
              {
                width: "auto",
                alignment: "right",
                stack: [{ text: `Fecha: ${today}`, fontSize: 8.5, color: C_GRAY }],
              },
            ],
            columnGap: 10,
            margin: [0, 0, 0, 6],
          });

          // Línea azul separadora
          content.push({
            canvas: [{ type: "line", x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 2, lineColor: C_BLUE }],
            margin: [0, 0, 0, 8],
          });

          // Título de la sección
          content.push({
            text: cfg.label.toUpperCase(),
            fontSize: 11,
            bold: true,
            alignment: "center",
            color: "#1e3a5f",
            margin: [0, 0, 0, 8],
          });

          // Datos del paciente
          content.push({
            layout: "patientLayout",
            table: {
              widths: ["*", "*"],
              body: [
                [
                  { text: [{ text: "Paciente: ", bold: true }, patientName], fontSize: 8.5, fillColor: "#eff6ff" },
                  { text: [{ text: "Profesional: ", bold: true }, providerName], fontSize: 8.5, fillColor: "#eff6ff" },
                ],
                [
                  {
                    colSpan: 2,
                    text: [
                      { text: "Visita: ", bold: true },
                      activeVisit ? activeVisit.visitType?.display || activeVisit.uuid : "Sin visita activa",
                    ],
                    fontSize: 8.5,
                    fillColor: "#eff6ff",
                  },
                  {},
                ],
              ],
            },
            margin: [0, 0, 0, 10],
          });

          // Tabla de órdenes de la sección
          content.push({
            layout: "ordersLayout",
            table: {
              headerRows: 1,
              widths: cfg.widths,
              body: [
                cfg.headers.map((h) => ({
                  text: h,
                  bold: true,
                  fontSize: 8,
                  color: "#1e3a5f",
                  fillColor: C_BLUE_LIGHT,
                })),
                ...cfg.getRows(orders).map((cells, i) =>
                  cells.map((c) => ({
                    text: String(c || "–"),
                    fontSize: 8,
                    fillColor: i % 2 === 0 ? "#ffffff" : C_ALT_ROW,
                  }))
                ),
              ],
            },
            margin: [0, 0, 0, 8],
          });

          // Línea de cierre
          content.push({
            canvas: [{ type: "line", x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5, lineColor: C_BORDER }],
            margin: [0, 16, 0, 8],
          });

          // Pie de página
          content.push({
            columns: [
              {
                width: "*",
                stack: [
                  { text: [{ text: "Profesional: ", bold: true }, providerName], fontSize: 8.5 },
                  { text: "Firma: _______________________", fontSize: 8.5, margin: [0, 12, 0, 0] },
                  { text: "RUT: __________________________", fontSize: 8.5, margin: [0, 4, 0, 0] },
                ],
              },
              {
                width: "auto",
                alignment: "right",
                stack: [
                  { text: institution.name, fontSize: 8.5 },
                  { text: institution.address, fontSize: 8.5, margin: [0, 2, 0, 0] },
                ],
              },
            ],
            columnGap: 10,
          });

          /* global pdfMake */
          pdfMake
            .createPdf(
              { pageSize: "A4", pageMargins: [40, 40, 40, 40], content, defaultStyle: { font: "Roboto" } },
              tableLayouts
            )
            .getBase64((base64) => resolve(base64));
        } catch (err) {
          reject(err);
        }
      });
    },
    [allOrders, institution, patientName, provider, activeVisit]
  );


  // ── Imprimir UNA sección específica ───────────────────────────────────────
  const handlePrintSection = useCallback(async (sectionKey) => {
    setPrintingSection(sectionKey);
    try {
      const base64 = await generateSectionPdfBase64(sectionKey);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      console.error("AllOrdersDashboard: error imprimiendo sección", sectionKey, err);
    } finally {
      setPrintingSection(null);
    }
  }, [generateSectionPdfBase64]);

  // ── Imprimir UNA orden individual (botón de la fila) ──────────────────────
  // Reutiliza generateSectionPdfBase64 pasando solo [order] como overrideOrders.
  const handlePrintOrder = useCallback(async (order) => {
    const sectionKey = order.sectionKey;
    if (!sectionKey || !ALL_SECTIONS_CONFIG[sectionKey]) return;
    setPrintingSection(`row_${order.id}`);
    try {
      const base64 = await generateSectionPdfBase64(sectionKey, [order]);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      console.error("AllOrdersDashboard: error imprimiendo orden individual", err);
    } finally {
      setPrintingSection(null);
    }
  }, [generateSectionPdfBase64]);



  // ── Envío de correo ────────────────────────────────────────────────────────
  // La API de Bahmni /send/email tiene una limitación de backend:
  // solo procesa el ÚLTIMO adjunto del array mailAttachments.
  // Solución: una llamada por sección → un correo por tipo de orden.
  const handleSendEmail = async () => {
    if (!patientUuid) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const today = new Date().toLocaleDateString("es-CL");
      const todayFile = today.replace(/\//g, "-");
      const patientSlug = patientName.replace(/\s+/g, "_");
      const providerName = provider?.person?.display || provider?.display || institution.name;
      // institution viene del estado (cargado dinámicamente desde OpenMRS)

      // Si shareSection está definido → solo esa sección; si no → todas las activas
      const activeSections = Object.entries(ALL_SECTIONS_CONFIG).filter(([key]) =>
        shareSection ? key === shareSection : allOrders[key]?.length > 0
      );
      const total = activeSections.length;
      const emailUrl = `/openmrs/ws/rest/v1/patient/${patientUuid}/send/email`;

      // Generamos y enviamos SECUENCIALMENTE para evitar race conditions de pdfMake
      // y para cumplir con la limitación de 1 adjunto por llamada a la API.
      for (let i = 0; i < activeSections.length; i++) {
        const [key, cfg] = activeSections[i];

        // Generar PDF de esta sección
        const base64 = await generateSectionPdfBase64(key);
        const fileName = `${cfg.filePrefix}_${patientSlug}_${todayFile}.pdf`;

        // Asunto numerado para que el paciente sepa que son parte de un mismo envío
        const subject = total > 1
          ? `[${i + 1}/${total}] Órdenes médicas – ${cfg.label} – ${patientName} – ${today}`
          : `Órdenes médicas – ${cfg.label} – ${patientName} – ${today}`;

        const body = [
          `Estimado/a ${patientName},`,
          "",
          total > 1
            ? `Adjunto encontrará el PDF de ${cfg.label} (correo ${i + 1} de ${total}).`
            : `Adjunto encontrará el PDF de ${cfg.label}.`,
          "",
          "Atentamente,",
          providerName,
          institution.name,
          institution.address,
          institution.phone,
        ].join("\n");

        const response = await fetch(emailUrl, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            mailAttachments: [{ contentType: "application/pdf", name: fileName, data: base64 }],
            subject,
            body,
            cc: [],
            bcc: [],
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.statusLine && data.statusLine.statusCode !== 200) {
          throw new Error(data.statusLine.reasonPhrase || "Error del servidor");
        }
      }

      setEmailStatus({ kind: "success", count: total });
      setTimeout(() => { setIsShareModalOpen(false); setShareSection(null); setEmailStatus(null); }, 3000);
    } catch (err) {
      console.error("AllOrdersDashboard: error enviando email", err);
      setEmailStatus({ kind: "error" });
    } finally {
      setEmailSending(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderDetailModal = () => {
    if (!selectedOrder) return null;
    return (
      <Modal
        open={isDetailModalOpen}
        modalHeading={`Detalle: ${selectedOrder.conceptName || selectedOrder.drugName || selectedOrder.orderNumber}`}
        primaryButtonText={printingSection ? "Generando PDF…" : "Imprimir esta sección"}
        secondaryButtonText="Cerrar"
        onRequestClose={() => setIsDetailModalOpen(false)}
        onRequestSubmit={() => {
          const typeToSection = {
            "Laboratorio": "laboratory", "Imagenología": "imaging",
            "Medicamento": "medication",  "Procedimiento": "procedure",
            "Derivación": "referral",
          };
          // sectionKey es la fuente más fiable; typeToSection como fallback legacy
          const key = selectedOrder.sectionKey
            || typeToSection[selectedOrder.type]
            || "laboratory";
          handlePrintSection(key);
        }}
        onSecondarySubmit={() => setIsDetailModalOpen(false)}
        className="all-orders__detail-modal"
      >
        <div className="all-orders__detail-content">
          <div className="all-orders__detail-row">
            <Tag type="blue" size="sm">{selectedOrder.type}</Tag>
          </div>
          {selectedOrder.orderNumber && (
            <p><strong>N° Orden:</strong> {selectedOrder.orderNumber}</p>
          )}
          {selectedOrder.conceptName && (
            <p><strong>Descripción:</strong> {selectedOrder.conceptName}</p>
          )}
          {selectedOrder.drugName && (
            <p><strong>Medicamento:</strong> {selectedOrder.drugName}</p>
          )}
          {selectedOrder.dosage && (
            <p><strong>Dosis:</strong> {selectedOrder.dosage}</p>
          )}
          {selectedOrder.orderDate && (
            <p><strong>Fecha:</strong> {selectedOrder.orderDate}</p>
          )}
          {selectedOrder.orderer && (
            <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
          )}
          {selectedOrder.status && (
            <p><strong>Estado:</strong> {selectedOrder.status}</p>
          )}
          {selectedOrder.details && (
            <>
              <hr />
              <p><strong>Indicaciones:</strong></p>
              <p className="all-orders__details-text">{selectedOrder.details}</p>
            </>
          )}
        </div>
      </Modal>
    );
  };

  const renderShareModal = () => {
    // ¿Modo sección única o todas?
    const isSingle   = !!shareSection;
    const singleCfg  = isSingle ? SECTIONS_CONFIG[shareSection] : null;
    const singleCount = isSingle ? allOrders[shareSection]?.length ?? 0 : 0;

    const sectionsWithOrders = isSingle
      ? (singleCount > 0 ? [shareSection] : [])
      : Object.keys(SECTIONS_CONFIG).filter(k => allOrders[k]?.length > 0);
    const n = sectionsWithOrders.length;

    const modalHeading = isSingle
      ? `Compartir ${singleCfg?.label ?? ""}`
      : "Compartir todas las órdenes por correo";

    const primaryText = emailSending
      ? "Generando PDF y enviando…"
      : isSingle
        ? `Enviar 1 correo (${singleCfg?.label ?? ""})`
        : `Enviar ${n} correo${n !== 1 ? "s" : ""} (1 PDF por tipo)`;

    const closeModal = () => { setIsShareModalOpen(false); setShareSection(null); setEmailStatus(null); };

    return (
      <Modal
        open={isShareModalOpen}
        modalHeading={modalHeading}
        primaryButtonText={primaryText}
        secondaryButtonText="Cancelar"
        primaryButtonDisabled={emailSending || !patientUuid || n === 0}
        onRequestClose={closeModal}
        onRequestSubmit={handleSendEmail}
        onSecondarySubmit={closeModal}
        className="all-orders__share-modal"
      >
        <div className="all-orders__share-content">
          {isSingle ? (
            <p className="all-orders__share-summary">
              Se enviará <strong>1 correo</strong> con el PDF de{" "}
              <strong>{singleCfg?.label}</strong> ({singleCount} orden{singleCount !== 1 ? "es" : ""}) al correo
              registrado del paciente <strong>{patientName}</strong>.
            </p>
          ) : (
            <p className="all-orders__share-summary">
              Se enviarán <strong>{n} correo{n !== 1 ? "s separados" : ""}</strong> al paciente{" "}
              <strong>{patientName}</strong>, cada uno con el PDF de un tipo de orden.
              {n > 1 && (
                <span> El asunto incluirá <em>[1/{n}], [2/{n}]…</em> para identificarlos.</span>
              )}
            </p>
          )}

          <div className="all-orders__share-breakdown">
            {isSingle ? (
              <Tag type="blue" size="sm">{singleCfg?.label}: {singleCount}</Tag>
            ) : (
              <>
                {allOrders.laboratory?.length > 0 && <Tag type="blue"      size="sm">Laboratorio: {allOrders.laboratory.length}</Tag>}
                {allOrders.imaging?.length    > 0 && <Tag type="teal"      size="sm">Imagenología: {allOrders.imaging.length}</Tag>}
                {allOrders.medication?.length > 0 && <Tag type="green"     size="sm">Medicamentos: {allOrders.medication.length}</Tag>}
                {allOrders.procedure?.length  > 0 && <Tag type="purple"    size="sm">Procedimientos: {allOrders.procedure.length}</Tag>}
                {allOrders.referral?.length   > 0 && <Tag type="warm-gray" size="sm">Derivaciones: {allOrders.referral.length}</Tag>}
                {Object.entries(FORM_SECTIONS_CONFIG).map(([k, cfg]) =>
                  allOrders[k]?.length > 0 && (
                    <Tag key={k} type={cfg.tagColor || "cyan"} size="sm">
                      {cfg.label}: {allOrders[k].length}
                    </Tag>
                  )
                )}
              </>
            )}
          </div>

          <div className="all-orders__share-email-info">
            <p className="all-orders__share-email-label">Correo electrónico del paciente</p>
            <p className="all-orders__share-email-value">
              {patientEmail ? patientEmail : <em style={{ color: "#6f6f6f" }}>(no registrado)</em>}
            </p>
          </div>

          {emailStatus?.kind === "success" && (
            <InlineNotification
              kind="success"
              title={emailStatus.count === 1 ? "¡Correo enviado!" : "¡Correos enviados!"}
              subtitle={
                emailStatus.count === 1
                  ? `Se envió 1 correo con el PDF de ${singleCfg?.label ?? "la sección"} al paciente.`
                  : `Se enviaron ${emailStatus.count} correos con PDF adjunto al paciente.`
              }
              hideCloseButton
            />
          )}
          {emailStatus?.kind === "error" && (
            <InlineNotification
              kind="error"
              title="Error al enviar"
              subtitle="No se pudo enviar el correo. Verifique que el paciente tiene un email registrado e inténtelo nuevamente."
              hideCloseButton
            />
          )}
        </div>
      </Modal>
    );
  };


  // ── Render principal ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <I18nProvider>
        <div className="all-orders__loading">
          <Loading description="Cargando órdenes del paciente…" withOverlay={false} />
        </div>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <div className="all-orders__container">
        {/* ── Cabecera: sin botón imprimir global (ahora está por sección) ── */}
        <div className="all-orders__header">
          <div className="all-orders__header-info">
            <h2 className="all-orders__title">Órdenes del Paciente</h2>
            <p className="all-orders__subtitle">
              {patientName}
              {activeVisit && (
                <span className="all-orders__visit-badge">
                  {" "} · Visita activa: {activeVisit.visitType?.display || activeVisit.uuid}
                </span>
              )}
            </p>
          </div>
          <div className="all-orders__header-actions">
            <Button
              kind="primary"
              renderIcon={Share16}
              onClick={() => handleShareSection(null)}
              disabled={totalOrders === 0}
            >
              Compartir todo ({totalOrders})
            </Button>
          </div>
        </div>

        {/* ── Selector de visita ── */}
        {visits.length > 0 && (
          <div className="all-orders__visit-filter">
            <Select
              id="visit-selector"
              labelText="Ver órdenes de:"
              value={selectedVisitUuid || ""}
              onChange={(e) => handleVisitChange(e.target.value)}
              size="sm"
            >
              {visits.map((v, idx) => (
                <SelectItem
                  key={v.uuid}
                  value={v.uuid}
                  text={idx === 0
                    ? `${formatVisitLabel(v)}  ★ más reciente`
                    : formatVisitLabel(v)}
                />
              ))}
              <SelectItem value="" text="— Todas las visitas (histórico) —" />
            </Select>
            {selectedVisitUuid && (
              <p className="all-orders__visit-hint">
                Mostrando órdenes de la visita seleccionada.
                {" "}
                <button
                  className="all-orders__visit-hint-link"
                  onClick={() => handleVisitChange("")}
                >
                  Ver historial completo
                </button>
              </p>
            )}
          </div>
        )}

        {/* ── Estado vacío global ── */}
        {totalOrders === 0 ? (
          <div className="all-orders__global-empty">
            <p className="all-orders__global-empty-icon">📋</p>
            <p className="all-orders__global-empty-title">Sin órdenes registradas</p>
            <p className="all-orders__global-empty-subtitle">
              No se encontraron órdenes de laboratorio, imagenología, medicamentos,
              procedimientos ni derivaciones para este paciente.
            </p>
          </div>
        ) : (
          <Tabs className="all-orders__tabs">

            {/* LABORATORIO */}
            <Tab id="tab-laboratory" label={`Laboratorio${allOrders.laboratory.length ? ` (${allOrders.laboratory.length})` : ""}`}>
              <div className="all-orders__tab-toolbar">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Printer16}
                  onClick={() => handlePrintSection("laboratory")}
                  disabled={printingSection === "laboratory" || allOrders.laboratory.length === 0}
                >
                  {printingSection === "laboratory" ? "Generando…" : "Imprimir Laboratorio"}
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Share16}
                  onClick={() => handleShareSection("laboratory")}
                  disabled={emailSending || allOrders.laboratory.length === 0}
                >
                  Enviar Laboratorio
                </Button>
              </div>
              <TableContainer title="Órdenes de Laboratorio" className="all-orders__table-container">
                <OrdersTable
                  orders={paginatedOrders("laboratory")}
                  headers={LAB_HEADERS}
                  onView={handleViewOrder}
                  onPrint={handlePrintOrder}
                  pageSize={pagination.laboratory.pageSize}
                  currentPage={pagination.laboratory.page}
                  totalItems={allOrders.laboratory.length}
                  onPageChange={(p) => handlePaginationChange("laboratory", p)}
                />
              </TableContainer>
            </Tab>

            {/* IMAGENOLOGÍA */}
            <Tab id="tab-imaging" label={`Imagenología${allOrders.imaging.length ? ` (${allOrders.imaging.length})` : ""}`}>
              <div className="all-orders__tab-toolbar">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Printer16}
                  onClick={() => handlePrintSection("imaging")}
                  disabled={printingSection === "imaging" || allOrders.imaging.length === 0}
                >
                  {printingSection === "imaging" ? "Generando…" : "Imprimir Imagenología"}
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Share16}
                  onClick={() => handleShareSection("imaging")}
                  disabled={emailSending || allOrders.imaging.length === 0}
                >
                  Enviar Imagenología
                </Button>
              </div>
              <TableContainer title="Órdenes de Imagenología" className="all-orders__table-container">
                <OrdersTable
                  orders={paginatedOrders("imaging")}
                  headers={IMAGING_HEADERS}
                  onView={handleViewOrder}
                  onPrint={handlePrintOrder}
                  pageSize={pagination.imaging.pageSize}
                  currentPage={pagination.imaging.page}
                  totalItems={allOrders.imaging.length}
                  onPageChange={(p) => handlePaginationChange("imaging", p)}
                />
              </TableContainer>
            </Tab>

            {/* MEDICAMENTOS */}
            <Tab id="tab-medication" label={`Medicamentos${allOrders.medication.length ? ` (${allOrders.medication.length})` : ""}`}>
              <div className="all-orders__tab-toolbar">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Printer16}
                  onClick={() => handlePrintSection("medication")}
                  disabled={printingSection === "medication" || allOrders.medication.length === 0}
                >
                  {printingSection === "medication" ? "Generando…" : "Imprimir Medicamentos"}
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Share16}
                  onClick={() => handleShareSection("medication")}
                  disabled={emailSending || allOrders.medication.length === 0}
                >
                  Enviar Medicamentos
                </Button>
              </div>
              <TableContainer title="Recetas Médicas" className="all-orders__table-container">
                <OrdersTable
                  orders={paginatedOrders("medication")}
                  headers={MEDICATION_HEADERS}
                  onView={handleViewOrder}
                  onPrint={handlePrintOrder}
                  pageSize={pagination.medication.pageSize}
                  currentPage={pagination.medication.page}
                  totalItems={allOrders.medication.length}
                  onPageChange={(p) => handlePaginationChange("medication", p)}
                />
              </TableContainer>
            </Tab>

            {/* PROCEDIMIENTOS */}
            <Tab id="tab-procedure" label={`Procedimientos${allOrders.procedure.length ? ` (${allOrders.procedure.length})` : ""}`}>
              <div className="all-orders__tab-toolbar">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Printer16}
                  onClick={() => handlePrintSection("procedure")}
                  disabled={printingSection === "procedure" || allOrders.procedure.length === 0}
                >
                  {printingSection === "procedure" ? "Generando…" : "Imprimir Procedimientos"}
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Share16}
                  onClick={() => handleShareSection("procedure")}
                  disabled={emailSending || allOrders.procedure.length === 0}
                >
                  Enviar Procedimientos
                </Button>
              </div>
              <TableContainer title="Órdenes de Procedimientos" className="all-orders__table-container">
                <OrdersTable
                  orders={paginatedOrders("procedure")}
                  headers={PROCEDURE_HEADERS}
                  onView={handleViewOrder}
                  onPrint={handlePrintOrder}
                  pageSize={pagination.procedure.pageSize}
                  currentPage={pagination.procedure.page}
                  totalItems={allOrders.procedure.length}
                  onPageChange={(p) => handlePaginationChange("procedure", p)}
                />
              </TableContainer>
            </Tab>

            {/* DERIVACIONES */}
            <Tab id="tab-referral" label={`Derivaciones${allOrders.referral.length ? ` (${allOrders.referral.length})` : ""}`}>
              <div className="all-orders__tab-toolbar">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Printer16}
                  onClick={() => handlePrintSection("referral")}
                  disabled={printingSection === "referral" || allOrders.referral.length === 0}
                >
                  {printingSection === "referral" ? "Generando…" : "Imprimir Derivaciones"}
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Share16}
                  onClick={() => handleShareSection("referral")}
                  disabled={emailSending || allOrders.referral.length === 0}
                >
                  Enviar Derivaciones
                </Button>
              </div>
              <TableContainer title="Derivaciones" className="all-orders__table-container">
                <OrdersTable
                  orders={paginatedOrders("referral")}
                  headers={REFERRAL_HEADERS}
                  onView={handleViewOrder}
                  onPrint={handlePrintOrder}
                  pageSize={pagination.referral.pageSize}
                  currentPage={pagination.referral.page}
                  totalItems={allOrders.referral.length}
                  onPageChange={(p) => handlePaginationChange("referral", p)}
                />
              </TableContainer>
            </Tab>

            {/* FORMULARIOS BAHMNI – generados dinámicamente desde dashboardConfig.formSections */}
            {Object.entries(FORM_SECTIONS_CONFIG).map(([key, cfg]) => (
              <Tab
                key={key}
                id={`tab-${key}`}
                label={`${cfg.label}${allOrders[key]?.length ? ` (${allOrders[key].length})` : ""}`}
              >
                <div className="all-orders__tab-toolbar">
                  <Button
                    kind="ghost" size="sm" renderIcon={Printer16}
                    onClick={() => handlePrintSection(key)}
                    disabled={printingSection === key || !allOrders[key]?.length}
                  >
                    {printingSection === key ? "Generando…" : `Imprimir ${cfg.label}`}
                  </Button>
                  <Button
                    kind="ghost" size="sm" renderIcon={Share16}
                    onClick={() => handleShareSection(key)}
                    disabled={emailSending || !allOrders[key]?.length}
                  >
                    {`Enviar ${cfg.label}`}
                  </Button>
                </div>
                <TableContainer title={cfg.label} className="all-orders__table-container">
                  <OrdersTable
                    orders={paginatedOrders(key)}
                    headers={cfg.tableHeaders}
                    onView={handleViewOrder}
                    onPrint={handlePrintOrder}
                    pageSize={pagination[key]?.pageSize || 5}
                    currentPage={pagination[key]?.page || 1}
                    totalItems={allOrders[key]?.length || 0}
                    onPageChange={(p) => handlePaginationChange(key, p)}
                  />
                </TableContainer>
              </Tab>
            ))}

          </Tabs>
        )}

        {/* ── Modales ── */}
        {renderDetailModal()}
        {renderShareModal()}
      </div>
    </I18nProvider>
  );
}

AllOrdersDashboard.propTypes = {
  hostData: PropTypes.shape({
    patient: PropTypes.object,
    provider: PropTypes.object,
    activeVisit: PropTypes.object,
  }).isRequired,
  hostApi: PropTypes.shape({
    refresh: PropTypes.func,
  }),
  tx: PropTypes.func,
  appService: PropTypes.object,
};

