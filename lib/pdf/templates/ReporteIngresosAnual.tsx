import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { S, C } from "../styles";
import type { ReporteIngresosAnualData } from "../queries";

export function ReporteIngresosAnual({ data }: { data: ReporteIngresosAnualData }) {
  const mesesConMovimiento = data.meses.filter((m) => m.totalCobrado > 0 || m.pendiente > 0);

  return (
    <Document title={`Ingresos Anuales ${data.anio}`} author="SisLider">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.headerBrand}>SISLIDER · SISTEMA DE GESTIÓN ACADÉMICA</Text>
            <Text style={S.headerTitle}>Reporte de Ingresos Anual</Text>
            <Text style={S.headerSubtitle}>Año {data.anio}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerDate}>Generado el {data.generadoEn}</Text>
          </View>
        </View>

        {/* ── KPIs ────────────────────────────────────────────────── */}
        <View style={[S.section, { marginBottom: 14 }]}>
          <Text style={S.sectionTitle}>Resumen anual</Text>
          <View style={S.summaryRow}>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Total cobrado {data.anio}</Text>
              <Text style={S.summaryValueGreen}>S/{data.totalAnual.toFixed(2)}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Pendiente acumulado</Text>
              <Text style={data.totalPendiente > 0 ? S.summaryValueRed : S.summaryValue}>
                S/{data.totalPendiente.toFixed(2)}
              </Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Total transacciones</Text>
              <Text style={S.summaryValue}>
                {data.meses.reduce((s, m) => s + m.cantidadAbonos, 0)}
              </Text>
            </View>
            <View style={S.summaryBoxLast}>
              <Text style={S.summaryLabel}>Meses con actividad</Text>
              <Text style={S.summaryValue}>{mesesConMovimiento.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Tabla mensual ───────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Desglose mensual</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              <Text style={[S.tableHeadCell, { flex: 2 }]}>Mes</Text>
              <Text style={[S.tableHeadCell, { flex: 1, textAlign: "center" }]}>Cobros</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>Efectivo</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>Transferencia</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>Total cobrado</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>Pendiente</Text>
            </View>

            {data.meses.map((m, i) => {
              const isLast = i === data.meses.length - 1;
              const sinActividad = m.totalCobrado === 0 && m.pendiente === 0;
              return (
                <View
                  key={m.mes}
                  style={isLast ? S.tableRowLast : [S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                >
                  <Text style={[S.tableCellBold, { flex: 2 }]}>{m.mesNombre}</Text>
                  <Text style={[S.tableCellMuted, { flex: 1, textAlign: "center" }]}>
                    {m.cantidadAbonos > 0 ? m.cantidadAbonos : "—"}
                  </Text>
                  <Text style={[S.tableCellMuted, { flex: 2, textAlign: "right" }]}>
                    {m.totalEfectivo > 0 ? `S/${m.totalEfectivo.toFixed(2)}` : "—"}
                  </Text>
                  <Text style={[S.tableCellMuted, { flex: 2, textAlign: "right" }]}>
                    {m.totalTransferencia > 0 ? `S/${m.totalTransferencia.toFixed(2)}` : "—"}
                  </Text>
                  <Text style={[
                    m.totalCobrado > 0 ? S.tableCellBold : S.tableCellMuted,
                    { flex: 2, textAlign: "right", color: m.totalCobrado > 0 ? "#059669" : C.muted },
                  ]}>
                    {sinActividad ? "—" : `S/${m.totalCobrado.toFixed(2)}`}
                  </Text>
                  <Text style={[
                    m.pendiente > 0 ? S.tableCellBold : S.tableCellMuted,
                    { flex: 2, textAlign: "right", color: m.pendiente > 0 ? "#dc2626" : C.muted },
                  ]}>
                    {m.pendiente > 0 ? `S/${m.pendiente.toFixed(2)}` : "—"}
                  </Text>
                </View>
              );
            })}

            {/* Totals */}
            <View style={S.tableRowTotal}>
              <Text style={[S.tableCellBold, { flex: 2 }]}>TOTAL {data.anio}</Text>
              <Text style={[S.tableCellBold, { flex: 1, textAlign: "center" }]}>
                {data.meses.reduce((s, m) => s + m.cantidadAbonos, 0)}
              </Text>
              <Text style={[S.tableCellBold, { flex: 2, textAlign: "right" }]}>
                S/{data.meses.reduce((s, m) => s + m.totalEfectivo, 0).toFixed(2)}
              </Text>
              <Text style={[S.tableCellBold, { flex: 2, textAlign: "right" }]}>
                S/{data.meses.reduce((s, m) => s + m.totalTransferencia, 0).toFixed(2)}
              </Text>
              <Text style={[S.tableCellBold, { flex: 2, textAlign: "right", color: "#059669" }]}>
                S/{data.totalAnual.toFixed(2)}
              </Text>
              <Text style={[S.tableCellBold, { flex: 2, textAlign: "right", color: data.totalPendiente > 0 ? "#dc2626" : C.muted }]}>
                S/{data.totalPendiente.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Top meses ───────────────────────────────────────────── */}
        {mesesConMovimiento.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Meses con mayor recaudación</Text>
            <View style={S.infoRow}>
              {[...data.meses]
                .filter((m) => m.totalCobrado > 0)
                .sort((a, b) => b.totalCobrado - a.totalCobrado)
                .slice(0, 4)
                .map((m, i, arr) => (
                  i < arr.length - 1 ? (
                    <View key={m.mes} style={S.infoBox}>
                      <Text style={S.infoLabel}>#{i + 1} {m.mesNombre}</Text>
                      <Text style={[S.infoValue, { color: "#059669" }]}>S/{m.totalCobrado.toFixed(2)}</Text>
                      <Text style={[S.tableCellMuted, { marginTop: 2 }]}>{m.cantidadAbonos} cobros</Text>
                    </View>
                  ) : (
                    <View key={m.mes} style={S.infoBoxLast}>
                      <Text style={S.infoLabel}>#{i + 1} {m.mesNombre}</Text>
                      <Text style={[S.infoValue, { color: "#059669" }]}>S/{m.totalCobrado.toFixed(2)}</Text>
                      <Text style={[S.tableCellMuted, { marginTop: 2 }]}>{m.cantidadAbonos} cobros</Text>
                    </View>
                  )
                ))}
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
