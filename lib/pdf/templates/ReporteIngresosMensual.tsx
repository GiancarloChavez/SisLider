import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { S, C } from "../styles";
import type { ReporteIngresosMensualData } from "../queries";

function MetodoBadge({ metodo }: { metodo: string }) {
  if (metodo === "efectivo")      return <Text style={S.badgeGreen}>Efectivo</Text>;
  if (metodo === "transferencia") return <Text style={S.badgeBlue}>Transferencia</Text>;
  if (metodo === "yape")          return <Text style={S.badgePurple}>Yape</Text>;
  if (metodo === "plin")          return <Text style={S.badgePurple}>Plin</Text>;
  return <Text style={S.badgeGray}>{metodo}</Text>;
}

export function ReporteIngresosMensual({ data }: { data: ReporteIngresosMensualData }) {
  return (
    <Document
      title={`Ingresos ${data.mesNombre} ${data.anio}`}
      author="SisLider"
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.headerBrand}>SISLIDER · SISTEMA DE GESTIÓN ACADÉMICA</Text>
            <Text style={S.headerTitle}>Reporte de Ingresos Mensual</Text>
            <Text style={S.headerSubtitle}>{data.mesNombre} {data.anio}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerDate}>Generado el {data.generadoEn}</Text>
          </View>
        </View>

        {/* ── Resumen ─────────────────────────────────────────────── */}
        <View style={[S.section, { marginBottom: 14 }]}>
          <Text style={S.sectionTitle}>Resumen del mes</Text>
          <View style={S.summaryRow}>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Total cobrado</Text>
              <Text style={S.summaryValueGreen}>S/{data.totalGeneral.toFixed(2)}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Efectivo</Text>
              <Text style={S.summaryValue}>S/{data.totalEfectivo.toFixed(2)}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Transferencia</Text>
              <Text style={S.summaryValue}>S/{data.totalTransferencia.toFixed(2)}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Deuda del mes</Text>
              <Text style={data.deudaMes > 0 ? S.summaryValueRed : S.summaryValue}>
                S/{data.deudaMes.toFixed(2)}
              </Text>
            </View>
            <View style={S.summaryBoxLast}>
              <Text style={S.summaryLabel}>Alumnos con pago</Text>
              <Text style={S.summaryValue}>{data.alumnosUnicos}</Text>
            </View>
          </View>
        </View>

        {/* ── Detalle de abonos ───────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            Detalle de cobros — {data.abonos.length} registro{data.abonos.length !== 1 ? "s" : ""}
          </Text>

          {data.abonos.length === 0 ? (
            <Text style={{ fontSize: 9, color: C.muted }}>
              No se registraron cobros en {data.mesNombre} {data.anio}.
            </Text>
          ) : (
            <View style={S.table}>
              <View style={S.tableHead}>
                <Text style={[S.tableHeadCell, { flex: 3 }]}>Alumno</Text>
                <Text style={[S.tableHeadCell, { flex: 2.5 }]}>Curso</Text>
                <Text style={[S.tableHeadCell, { flex: 1.5 }]}>Método</Text>
                <Text style={[S.tableHeadCell, { flex: 1.5 }]}>Fecha</Text>
                <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Monto</Text>
              </View>

              {data.abonos.map((a, i) => (
                <View
                  key={i}
                  style={i === data.abonos.length - 1 ? S.tableRowLast : [S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                >
                  <Text style={[S.tableCell, { flex: 3 }]}>{a.alumno}</Text>
                  <Text style={[S.tableCellMuted, { flex: 2.5 }]}>{a.curso}</Text>
                  <View style={{ flex: 1.5 }}>
                    <MetodoBadge metodo={a.metodoPago} />
                  </View>
                  <Text style={[S.tableCellMuted, { flex: 1.5 }]}>{a.fecha}</Text>
                  <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right" }]}>
                    S/{a.monto.toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Total row */}
              <View style={S.tableRowTotal}>
                <Text style={[S.tableCellBold, { flex: 3 }]}>TOTAL</Text>
                <Text style={[S.tableCellMuted, { flex: 2.5 }]}>
                  {data.abonos.length} cobro{data.abonos.length !== 1 ? "s" : ""}
                </Text>
                <View style={{ flex: 1.5 }} />
                <View style={{ flex: 1.5 }} />
                <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right", color: "#059669" }]}>
                  S/{data.totalGeneral.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Desglose por método ─────────────────────────────────── */}
        {data.abonos.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Desglose por método de pago</Text>
            <View style={S.infoRow}>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Efectivo</Text>
                <Text style={S.infoValue}>S/{data.totalEfectivo.toFixed(2)}</Text>
                <Text style={[S.tableCellMuted, { marginTop: 2 }]}>
                  {data.abonos.filter((a) => a.metodoPago === "efectivo").length} transacciones
                </Text>
              </View>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Transferencia</Text>
                <Text style={S.infoValue}>S/{data.totalTransferencia.toFixed(2)}</Text>
                <Text style={[S.tableCellMuted, { marginTop: 2 }]}>
                  {data.abonos.filter((a) => a.metodoPago === "transferencia").length} transacciones
                </Text>
              </View>
              <View style={S.infoBox}>
                <Text style={S.infoLabel}>Yape / Plin</Text>
                <Text style={S.infoValue}>S/{data.totalYapePlin.toFixed(2)}</Text>
                <Text style={[S.tableCellMuted, { marginTop: 2 }]}>
                  {data.abonos.filter((a) => a.metodoPago === "yape" || a.metodoPago === "plin").length} transacciones
                </Text>
              </View>
              <View style={S.infoBoxLast}>
                <Text style={S.infoLabel}>Total general</Text>
                <Text style={[S.infoValue, { color: "#059669" }]}>S/{data.totalGeneral.toFixed(2)}</Text>
                <Text style={[S.tableCellMuted, { marginTop: 2 }]}>
                  {data.abonos.length} transacciones totales
                </Text>
              </View>
            </View>
          </View>
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
