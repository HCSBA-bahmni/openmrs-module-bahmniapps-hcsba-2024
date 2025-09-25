import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Stethoscope,
  Syringe,
  Pill,
  ShieldAlert,
  Activity,
  User2,
  Calendar,
  FileText,
  Hash,
  FileUp,
  ClipboardPaste,
  RefreshCw,
  Layers,
  Filter,
} from "lucide-react";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

// ---- Helpers ---------------------------------------------------------------
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const safe = (v, alt = "—") => (v === undefined || v === null || v === "" ? alt : v);

function getHumanName(nameArr) {
  if (!Array.isArray(nameArr) || nameArr.length === 0) return "—";
  const n = nameArr[0];
  const given = Array.isArray(n.given) ? n.given.join(" ") : n.given || "";
  return [given, n.family].filter(Boolean).join(" ");
}

function getAddress(addrArr) {
  if (!Array.isArray(addrArr) || addrArr.length === 0) return "—";
  const a = addrArr[0];
  return [
    Array.isArray(a.line) ? a.line.join(", ") : a.line,
    a.city,
    a.state,
    a.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function codingText(coding = [], text) {
  if (text) return text;
  const first = Array.isArray(coding) ? coding[0] : undefined;
  if (!first) return "—";
  return [first.display, first.code].filter(Boolean).join(" · ");
}

function isIPS(bundle) {
  if (!bundle || bundle.resourceType !== "Bundle") return false;
  // Heuristics: type document OR composition with IPS profile URL present
  const comp = (bundle.entry || []).map((e) => e.resource).find((r) => r?.resourceType === "Composition");
  if (!comp) return false;
  const profiles = comp.meta?.profile || [];
  return (
    bundle.type === "document" ||
    profiles.some((p) =>
      typeof p === "string" &&
      (p.includes("StructureDefinition/Composition-uv-ips") || p.includes("hl7.fhir.uv.ips"))
    )
  );
}

function getResourceMap(bundle) {
  const map = {};
  for (const e of bundle.entry || []) {
    const r = e.resource;
    if (!r?.resourceType) continue;
    (map[r.resourceType] ||= []).push(r);
  }
  return map;
}

function getPatient(bundle) {
  const m = getResourceMap(bundle);
  if (m.Patient?.length) return m.Patient[0];
  // Sometimes Composition.subject references Patient as contained or by id
  const comp = (bundle.entry || []).map((e) => e.resource).find((r) => r?.resourceType === "Composition");
  if (comp?.subject?.reference) {
    const ref = comp.subject.reference.replace("urn:uuid:", "");
    const found = (bundle.entry || [])
      .map((e) => e.resource)
      .find((r) => (r?.resourceType === "Patient" && (r.id === ref || `Patient/${r.id}` === comp.subject.reference)));
    if (found) return found;
  }
  return undefined;
}

function yearsBetween(dateStr) {
  if (!dateStr) return undefined;
  const b = new Date(dateStr);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function bundleStats(bundle) {
  const m = getResourceMap(bundle);
  const types = Object.keys(m).sort();
  const total = (bundle.entry || []).length;
  return { types, total, map: m };
}

function collectEvents(bundle) {
  const events = [];
  const pushEvt = (d, type, title, ref) => {
    if (!d) return;
    events.push({ date: new Date(d), type, title, ref });
  };
  const { map } = bundleStats(bundle);
  (map.Composition || []).forEach((c) => pushEvt(c.date, "Document", c.title || "IPS Composition", c));
  (map.Condition || []).forEach((r) => pushEvt(r.recordedDate || r.onsetDateTime, "Condition", codingText(r.code?.coding, r.code?.text), r));
  (map.Immunization || []).forEach((r) => pushEvt(r.occurrenceDateTime, "Immunization", codingText(r.vaccineCode?.coding, r.vaccineCode?.text), r));
  (map.Procedure || []).forEach((r) => pushEvt(r.performedDateTime, "Procedure", codingText(r.code?.coding, r.code?.text), r));
  (map.MedicationStatement || []).forEach((r) => pushEvt(r.dateAsserted || r.effectiveDateTime, "Medication", codingText(r.medicationCodeableConcept?.coding, r.medicationCodeableConcept?.text), r));
  (map.DiagnosticReport || []).forEach((r) => pushEvt(r.effectiveDateTime || r.issued, "DiagnosticReport", codingText(r.code?.coding, r.code?.text), r));
  (map.Observation || []).forEach((r) => pushEvt(r.effectiveDateTime || r.issued, "Observation", codingText(r.code?.coding, r.code?.text), r));
  events.sort((a, b) => a.date - b.date);
  return events;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function eventsBarData(events) {
  const byMonth = new Map();
  events.forEach((e) => {
    const k = monthKey(e.date);
    byMonth.set(k, (byMonth.get(k) || 0) + 1);
  });
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, count]) => ({ name, count }));
}

function ResourceIcon({ type }) {
  const map = {
    Condition: Stethoscope,
    Immunization: Syringe,
    Medication: Pill,
    MedicationStatement: Pill,
    MedicationRequest: Pill,
    AllergyIntolerance: ShieldAlert,
    Observation: Activity,
    Procedure: Stethoscope,
    Composition: FileText,
    Document: FileText,
    Patient: User2,
  };
  const Ico = map[type] || Layers;
  return <Ico className="w-4 h-4" />;
}

// ---- Sample minimal IPS (trimmed) -----------------------------------------
const sampleIPS = {
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "fullUrl": "urn:uuid:pat-1",
      "resource": {
        "resourceType": "Patient",
        "id": "pat-1",
        "name": [{ "family": "Parra", "given": ["Violeta"] }],
        "gender": "female",
        "birthDate": "1917-10-04",
        "address": [{ "line": ["Wheelwright 717"], "city": "Salvador", "country": "Chile" }],
        "identifier": [{ "system": "urn:pid", "value": "P12345678" }]
      }
    },
    {
      "fullUrl": "urn:uuid:comp-1",
      "resource": {
        "resourceType": "Composition",
        "id": "comp-1",
        "status": "final",
        "type": { "coding": [{ "code": "60591-5", "system": "http://loinc.org", "display": "Patient summary" }] },
        "date": "2025-07-30T12:00:00Z",
        "title": "International Patient Summary",
        "subject": { "reference": "urn:uuid:pat-1" }
      }
    },
    {
      "resource": {
        "resourceType": "Condition",
        "id": "cond-1",
        "recordedDate": "2022-06-01",
        "code": { "text": "Diabetes mellitus tipo 2" }
      }
    },
    {
      "resource": {
        "resourceType": "AllergyIntolerance",
        "id": "alg-1",
        "code": { "text": "Penicilina" },
        "recordedDate": "2019-03-10"
      }
    },
    {
      "resource": {
        "resourceType": "Immunization",
        "id": "imm-1",
        "occurrenceDateTime": "2024-10-10",
        "vaccineCode": { "text": "COVID-19 mRNA" }
      }
    }
  ]
};

// ---- Main Component --------------------------------------------------------
export default function IPSFHIRInterpreter() {
  const [raw, setRaw] = useState("");
  const [bundle, setBundle] = useState(null);
  const [filter, setFilter] = useState("All");
  const [textFilter, setTextFilter] = useState("");

  const validIPS = useMemo(() => (bundle ? isIPS(bundle) : false), [bundle]);
  const patient = useMemo(() => (bundle ? getPatient(bundle) : undefined), [bundle]);
  const stats = useMemo(() => (bundle ? bundleStats(bundle) : { types: [], total: 0, map: {} }), [bundle]);
  const events = useMemo(() => (bundle ? collectEvents(bundle) : []), [bundle]);
  const chartData = useMemo(() => eventsBarData(events), [events]);

  function tryLoad(text) {
    try {
      const json = JSON.parse(text);
      setBundle(json);
    } catch (e) {
      alert("JSON inválido. Revisa el formato.");
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => tryLoad(String(reader.result || ""));
    reader.readAsText(f);
  }

  function clearAll() {
    setRaw("");
    setBundle(null);
    setFilter("All");
    setTextFilter("");
  }

  const filteredTypes = useMemo(() => {
    const base = stats.types.filter((t) => t !== "Patient");
    if (filter === "All") return base;
    return base.filter((t) => t === filter);
  }, [stats.types, filter]);

  function matchText(r) {
    if (!textFilter) return true;
    const j = JSON.stringify(r).toLowerCase();
    return j.includes(textFilter.toLowerCase());
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">IPS FHIR Graphical Interpreter</h1>
            {bundle && (
              <Badge variant={validIPS ? "default" : "destructive"} className="ml-2">
                {validIPS ? "IPS detectado" : "No parece IPS"}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => clearAll()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Limpiar
            </Button>
            <Button variant="outline" onClick={() => setBundle(sampleIPS)}>
              <Layers className="w-4 h-4 mr-2" /> Cargar ejemplo
            </Button>
          </div>
        </div>

        {/* Loader */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cargar Bundle (JSON)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subir archivo</label>
              <Input type="file" accept="application/json,.json" onChange={onFile} />
              <p className="text-xs text-muted-foreground flex items-center gap-1"><FileUp className="w-3 h-3"/> .json con Bundle R4</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Pegar JSON</label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Pegue aquí el JSON del Bundle IPS"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="min-h-[100px] font-mono text-xs"
                />
                <Button onClick={() => tryLoad(raw)} className="self-start">
                  <ClipboardPaste className="w-4 h-4 mr-2" /> Cargar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Header */}
        {bundle && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100">
                      <User2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{safe(getHumanName(patient?.name), "Paciente sin nombre")}</div>
                      <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3"/> {patient?.identifier?.[0]?.value || "—"}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {fmt(patient?.birthDate)} {yearsBetween(patient?.birthDate) ? `(${yearsBetween(patient?.birthDate)} años)` : ""}</span>
                        <span>{patient?.gender || "—"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{getAddress(patient?.address)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Recursos: {stats.total}</Badge>
                    <Badge variant="outline">Tipos: {stats.types.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Tabs */}
        {bundle && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
              <TabsTrigger value="resources">Recursos</TabsTrigger>
              <TabsTrigger value="raw">JSON</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Conteo por tipo</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">#</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.types
                          .filter((t) => t !== "Patient")
                          .map((t) => (
                            <TableRow key={t}>
                              <TableCell className="flex items-center gap-2"><ResourceIcon type={t} /> {t}</TableCell>
                              <TableCell className="text-right">{stats.map[t].length}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Eventos por mes</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    {events.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RBarChart data={chartData}>
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <RTooltip />
                          <Bar dataKey="count" />
                        </RBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sin eventos fechados</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Destacados</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-3">
                  <HighlightList label="Alergias" icon={ShieldAlert} items={(stats.map.AllergyIntolerance || []).slice(0, 5).map((a) => ({
                    title: codingText(a.code?.coding, a.code?.text),
                    sub: fmt(a.recordedDate),
                  }))} />
                  <HighlightList label="Medicaciones" icon={Pill} items={
                    ((stats.map.MedicationStatement || []).map((m) => ({
                      title: codingText(m.medicationCodeableConcept?.coding, m.medicationCodeableConcept?.text),
                      sub: fmt(m.dateAsserted || m.effectiveDateTime),
                    })) || []).slice(0, 5)
                  } />
                  <HighlightList label="Condiciones" icon={Stethoscope} items={(stats.map.Condition || []).slice(0, 5).map((c) => ({
                    title: codingText(c.code?.coding, c.code?.text),
                    sub: fmt(c.recordedDate || c.onsetDateTime),
                  }))} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <ScrollArea className="h-[420px] pr-4">
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                      <div className="space-y-4">
                        {events.length ? (
                          events.map((e, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="flex items-start gap-3">
                              <div className="mt-1 p-1.5 rounded-full bg-white border shadow-sm"><ResourceIcon type={e.type} /></div>
                              <div>
                                <div className="text-sm font-medium">{e.title || e.type}</div>
                                <div className="text-xs text-muted-foreground">{fmt(e.date)}</div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No hay eventos cronológicos.</div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources */}
            <TabsContent value="resources" className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={filter === "All" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setFilter("All")}>Todos</Badge>
                {stats.types
                  .filter((t) => t !== "Patient")
                  .map((t) => (
                    <Badge key={t} variant={filter === t ? "default" : "secondary"} className="cursor-pointer" onClick={() => setFilter(t)}>
                      {t}
                    </Badge>
                  ))}
                <div className="ml-auto flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <Input placeholder="Filtrar por texto…" value={textFilter} onChange={(e) => setTextFilter(e.target.value)} className="w-56" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTypes.flatMap((t) => stats.map[t].filter(matchText).map((r, idx) => (
                  <ResourceCard key={`${t}-${r.id || idx}`} type={t} r={r} />
                )))}
              </div>
            </TabsContent>

            {/* Raw JSON */}
            <TabsContent value="raw" className="mt-4">
              <Card>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap break-all p-2 bg-slate-50 rounded-md">
                    {JSON.stringify(bundle, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!bundle && (
          <div className="text-sm text-muted-foreground">Cargue un Bundle IPS para comenzar. Puede usar el ejemplo si lo desea.</div>
        )}
      </div>
    </div>
  );
}

function HighlightList({ label, icon: Icon, items }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <div className="text-sm font-medium">{label}</div>
      </div>
      <ul className="space-y-1">
        {items.length ? (
          items.map((it, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{safe(it.title)}</span>
              <span className="text-muted-foreground">{it.sub ? ` · ${it.sub}` : ""}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">Sin datos</li>
        )}
      </ul>
    </div>
  );
}

function ResourceCard({ type, r }) {
  // Render a compact summary per resource type
  const rows = [];
  const add = (k, v) => rows.push([k, safe(v)]);

  switch (type) {
    case "AllergyIntolerance":
      add("Alergia", codingText(r.code?.coding, r.code?.text));
      add("Gravedad", r.criticality);
      add("Fecha", r.recordedDate);
      break;
    case "MedicationStatement":
      add("Medicamento", codingText(r.medicationCodeableConcept?.coding, r.medicationCodeableConcept?.text));
      add("Estado", r.status);
      add("Desde", r.effectiveDateTime || r.dateAsserted);
      break;
    case "MedicationRequest":
      add("Solicitud", codingText(r.medicationCodeableConcept?.coding, r.medicationCodeableConcept?.text));
      add("Estado", r.status);
      add("Fecha", r.authoredOn);
      break;
    case "Immunization":
      add("Vacuna", codingText(r.vaccineCode?.coding, r.vaccineCode?.text));
      add("Fecha", r.occurrenceDateTime);
      add("Lote", r.lotNumber);
      break;
    case "Condition":
      add("Diagnóstico", codingText(r.code?.coding, r.code?.text));
      add("Inicio", r.onsetDateTime || r.recordedDate);
      add("Estado", r.clinicalStatus?.text || r.clinicalStatus?.coding?.[0]?.code);
      break;
    case "Procedure":
      add("Procedimiento", codingText(r.code?.coding, r.code?.text));
      add("Fecha", r.performedDateTime);
      add("Estado", r.status);
      break;
    case "Observation":
      add("Observación", codingText(r.code?.coding, r.code?.text));
      if (r.valueQuantity) add("Valor", `${r.valueQuantity.value} ${r.valueQuantity.unit || r.valueQuantity.code || ""}`);
      add("Fecha", r.effectiveDateTime || r.issued);
      break;
    case "DiagnosticReport":
      add("Reporte", codingText(r.code?.coding, r.code?.text));
      add("Fecha", r.effectiveDateTime || r.issued);
      add("Estado", r.status);
      break;
    case "Composition":
      add("Título", r.title);
      add("Fecha", r.date);
      add("Estado", r.status);
      break;
    default:
      // generic fallback
      Object.entries(r)
        .filter(([k, v]) => typeof v !== "object")
        .slice(0, 3)
        .forEach(([k, v]) => add(k, String(v)));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="rounded-full p-1"><ResourceIcon type={type} /></Badge>
            {type}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Table>
            <TableBody>
              {rows.map(([k, v], i) => (
                <TableRow key={i}>
                  <TableCell className="w-32 text-muted-foreground">{k}</TableCell>
                  <TableCell>{v}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
