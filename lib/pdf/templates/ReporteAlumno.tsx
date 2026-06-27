import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { S, C } from "../styles";
import type { ReporteAlumnoData } from "../queries";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DIA_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DIA_ABREV: Record<string, string> = {
  Lunes:"Lu", Martes:"Ma", Miércoles:"Mi", Jueves:"Ju", Viernes:"Vi", Sábado:"Sa", Domingo:"Do",
};

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "pagado")   return <Text style={S.badgeGreen}>Pagado</Text>;
  if (estado === "parcial")  return <Text style={S.badgeAmber}>Parcial</Text>;
  return <Text style={S.badgeRed}>Pendiente</Text>;
}

function MatriculaEstadoBadge({ estado }: { estado: string }) {
  if (estado === "activa") return <Text style={S.badgeGreen}>Activa</Text>;
  return <Text style={S.badgeGray}>Inactiva</Text>;
}

export function ReporteAlumno({ data }: { data: ReporteAlumnoData }) {
  const fullName = `${data.alumno.apellido}, ${data.alumno.nombre}`;

  return (
    <Document title={`Reporte Alumno — ${fullName}`} author="SisLider">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.headerBrand}>SISLIDER · SISTEMA DE GESTIÓN ACADÉMICA</Text>
            <Text style={S.headerTitle}>Reporte de Alumno</Text>
            <Text style={S.headerSubtitle}>{fullName}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerDate}>Generado el {data.generadoEn}</Text>
          </View>
        </View>

        {/* ── Datos personales ────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Datos personales</Text>
          <View style={S.infoRow}>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Apellido y nombre</Text>
              <Text style={S.infoValue}>{fullName}</Text>
            </View>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>DNI</Text>
              <Text style={S.infoValue}>{data.alumno.dni ?? "—"}</Text>
            </View>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Celular</Text>
              <Text style={S.infoValue}>{data.alumno.celular ?? "—"}</Text>
            </View>
            <View style={S.infoBoxLast}>
              <Text style={S.infoLabel}>Fecha de nacimiento</Text>
              <Text style={S.infoValue}>{data.alumno.fechaNacimiento ?? "—"}</Text>
            </View>
          </View>

          {data.tutor && (
            <View style={S.infoRow}>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Apoderado</Text>
                <Text style={S.infoValue}>{data.tutor.apellido}, {data.tutor.nombre}</Text>
              </View>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Relación</Text>
                <Text style={S.infoValue}>{data.tutor.relacion}</Text>
              </View>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Celular apoderado</Text>
                <Text style={S.infoValue}>{data.tutor.celular}</Text>
              </View>
              <View style={S.infoBoxLast}>
                <Text style={S.infoLabel}>Cel. adicional</Text>
                <Text style={S.infoValue}>{data.tutor.celularAdicional ?? "—"}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Matrículas ──────────────────────────────────────────── */}
        {data.matriculas.length === 0 ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Matrículas</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Sin matrículas registradas.</Text>
          </View>
        ) : (
          data.matriculas.map((m) => {
            const diasStr = [...m.dias]
              .sort((a, b) => DIA_ORDER.indexOf(a) - DIA_ORDER.indexOf(b))
              .map((d) => DIA_ABREV[d] ?? d)
              .join(" · ");
            const totalDebe = m.mesesPago.reduce((s, mp) => s + mp.saldo, 0);
            const totalPagado = m.mesesPago.reduce((s, mp) => s + mp.montoPagado, 0);
            const totalTotal = m.mesesPago.reduce((s, mp) => s + mp.montoTotal, 0);
            const totalAsistencias = m.asistencias.presente + m.asistencias.tarde +
              m.asistencias.ausente + m.asistencias.justificado;

            return (
              <View key={m.id} style={[S.section, S.courseCard]}>
                {/* Course header */}
                <View style={S.courseCardHeader}>
                  <View>
                    <Text style={S.courseCardHeaderText}>
                      {m.curso}{m.nivel ? ` — ${m.nivel}` : ""}
                    </Text>
                    <Text style={S.courseCardHeaderSub}>
                      {diasStr}  {m.horaInicio}–{m.horaFin}  ·  {m.aula}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <MatriculaEstadoBadge estado={m.estado} />
                    <Text style={[S.courseCardHeaderSub, { marginTop: 3 }]}>
                      S/{m.precioFinal.toFixed(2)}/mes{m.descuento ? ` (${m.descuento})` : ""}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: 8 }}>
                  {/* Course details row */}
                  <View style={[S.infoRow, { marginBottom: 8 }]}>
                    <View style={S.infoBox}>
                      <Text style={S.infoLabel}>Docente</Text>
                      <Text style={S.infoValueNormal}>{m.docente}</Text>
                    </View>
                    <View style={S.infoBox}>
                      <Text style={S.infoLabel}>Desde</Text>
                      <Text style={S.infoValueNormal}>{m.fechaInicio}</Text>
                    </View>
                    <View style={S.infoBox}>
                      <Text style={S.infoLabel}>Total meses</Text>
                      <Text style={S.infoValue}>{m.mesesPago.length}</Text>
                    </View>
                    <View style={S.infoBoxLast}>
                      <Text style={S.infoLabel}>Saldo pendiente</Text>
                      <Text style={[S.infoValue, { color: totalDebe > 0 ? "#dc2626" : C.green }]}>
                        S/{totalDebe.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Asistencias row */}
                  {totalAsistencias > 0 && (
                    <View style={[S.infoRow, { marginBottom: 8 }]}>
                      <View style={S.infoBox}>
                        <Text style={S.infoLabel}>Presentes</Text>
                        <Text style={[S.infoValue, { color: "#059669" }]}>{m.asistencias.presente}</Text>
                      </View>
                      <View style={S.infoBox}>
                        <Text style={S.infoLabel}>Tarde</Text>
                        <Text style={[S.infoValue, { color: "#d97706" }]}>{m.asistencias.tarde}</Text>
                      </View>
                      <View style={S.infoBox}>
                        <Text style={S.infoLabel}>Ausentes</Text>
                        <Text style={[S.infoValue, { color: "#dc2626" }]}>{m.asistencias.ausente}</Text>
                      </View>
                      <View style={S.infoBox}>
                        <Text style={S.infoLabel}>Justificados</Text>
                        <Text style={[S.infoValue, { color: "#2563eb" }]}>{m.asistencias.justificado}</Text>
                      </View>
                      <View style={S.infoBoxLast}>
                        <Text style={S.infoLabel}>Total clases</Text>
                        <Text style={S.infoValue}>{totalAsistencias}</Text>
                      </View>
                    </View>
                  )}

                  {/* Payments table */}
                  {m.mesesPago.length > 0 && (
                    <View style={S.table}>
                      <View style={S.tableHead}>
                        <Text style={[S.tableHeadCell, { flex: 2 }]}>Mes</Text>
                        <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Total</Text>
                        <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Pagado</Text>
                        <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Saldo</Text>
                        <Text style={[S.tableHeadCell, { flex: 1.5 }]}>Estado</Text>
                      </View>

                      {m.mesesPago.map((mp, i) => (
                        <View
                          key={`${mp.anio}-${mp.mes}`}
                          style={i === m.mesesPago.length - 1 ? S.tableRowLast : [S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                        >
                          <Text style={[S.tableCell, { flex: 2 }]}>
                            {MESES[mp.mes - 1]} {mp.anio}
                          </Text>
                          <Text style={[S.tableCellMuted, { flex: 1.5, textAlign: "right" }]}>
                            S/{mp.montoTotal.toFixed(2)}
                          </Text>
                          <Text style={[S.tableCell, { flex: 1.5, textAlign: "right", color: "#059669" }]}>
                            S/{mp.montoPagado.toFixed(2)}
                          </Text>
                          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right", color: mp.saldo > 0 ? "#dc2626" : C.muted }]}>
                            S/{mp.saldo.toFixed(2)}
                          </Text>
                          <View style={{ flex: 1.5 }}>
                            <EstadoBadge estado={mp.estado} />
                          </View>
                        </View>
                      ))}

                      {/* Totals row */}
                      <View style={S.tableRowTotal}>
                        <Text style={[S.tableCellBold, { flex: 2 }]}>TOTAL</Text>
                        <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right" }]}>
                          S/{totalTotal.toFixed(2)}
                        </Text>
                        <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right", color: "#059669" }]}>
                          S/{totalPagado.toFixed(2)}
                        </Text>
                        <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right", color: totalDebe > 0 ? "#dc2626" : C.muted }]}>
                          S/{totalDebe.toFixed(2)}
                        </Text>
                        <View style={{ flex: 1.5 }} />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>SisLider · Sistema de Gestión Académica</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
