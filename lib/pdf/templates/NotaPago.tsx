import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { NotaPagoData } from "../queries";
import { amountToWords } from "../numToWords";

const NEGOCIO = {
  nombre: "NORIEGA BARDALES ROGER AUGUSTO",
  ruc: "10763159029",
  direccion: "JR ALZAMORA NRO 292",
  ciudad: "IQUITOS MAYNAS LORETO",
  telf: "931053998",
  correo: "lider.informes.peru@gmail.com",
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 26,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    borderStyle: "solid",
    marginBottom: 3,
  },
  headerBusiness: {
    flex: 1,
    flexDirection: "row",
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 7,
  },
  logoBox: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
    borderRightStyle: "solid",
    paddingRight: 8,
  },
  logoMain: { fontFamily: "Helvetica-Bold", fontSize: 20, color: "#000" },
  logoSub: { fontSize: 5.5, color: "#666", textAlign: "center" },
  businessName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 2.5 },
  businessDetail: { fontSize: 6.5, color: "#333", marginBottom: 1 },
  headerDoc: {
    width: 128,
    padding: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  docRuc: { fontSize: 7, textAlign: "center", marginBottom: 2 },
  docTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center", marginBottom: 5 },
  docNumber: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center" },

  // ── Client section ───────────────────────────────────────────────────────────
  clientRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    borderStyle: "solid",
    marginBottom: 3,
  },
  clientLeft: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 5,
  },
  clientRight: { width: 188, padding: 5 },
  clientDataRow: { flexDirection: "row", marginBottom: 2.5, alignItems: "flex-start" },
  clientLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, width: 56, marginRight: 2 },
  clientValue: { fontSize: 7, flex: 1 },

  // ── Table ────────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 0.5,
    borderColor: "#000",
    borderStyle: "solid",
    marginBottom: 3,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    backgroundColor: "#eeeeee",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableBody: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  thCell: { fontFamily: "Helvetica-Bold", fontSize: 6.5, textAlign: "center" },
  tdCell: { fontSize: 7.5 },
  colCant: { width: 32 },
  colUnidad: { width: 45 },
  colCodigo: { width: 45 },
  colDesc: { flex: 1 },
  colPrecio: { width: 55, textAlign: "right" },
  colMonto: { width: 55, textAlign: "right" },

  // ── SON (amount in words) ────────────────────────────────────────────────────
  sonRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 3.5,
    marginBottom: 3,
  },
  sonLabel: { fontFamily: "Helvetica-Bold", fontSize: 7.5, marginRight: 4 },
  sonText: { fontFamily: "Helvetica-Bold", fontSize: 7.5, flex: 1 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    borderStyle: "solid",
    marginTop: 3,
  },
  footerLeft: {
    width: 160,
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    borderRightStyle: "solid",
    padding: 7,
    alignItems: "center",
  },
  qrBox: {
    width: 68,
    height: 68,
    borderWidth: 0.5,
    borderColor: "#aaa",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  qrText: { fontSize: 7, color: "#999" },
  notaValida: { fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center", marginBottom: 5 },
  legalText: { fontSize: 5.5, color: "#555", textAlign: "center", lineHeight: 1.4 },
  footerRight: { flex: 1, padding: 5, justifyContent: "flex-end" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  totalLabel: { fontSize: 7, color: "#444" },
  totalValue: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  divider: { height: 0.3, backgroundColor: "#ccc", marginHorizontal: 4, marginVertical: 2 },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderTopStyle: "solid",
  },
  totalLabelFinal: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  totalValueFinal: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
});

const TOTAL_LABELS = [
  "SUB TOTAL S/",
  "DESCUENTO S/",
  "OP. GRAVADAS S/",
  "OP. INAFECTAS S/",
  "OP. GRATUITAS S/",
  "OP. EXONERADAS S/",
  "IGV S/",
  "ICBPER S/",
];

export function NotaPago({ data }: { data: NotaPagoData }) {
  const son = amountToWords(data.monto);
  const montoFmt = data.monto.toFixed(2);

  const totalValues = [
    montoFmt, "0.00", "0.00", "0.00", "0.00",
    montoFmt, // OP. EXONERADAS — exonerado de IGV zona de selva
    "0.00", "0.00",
  ];

  return (
    <Document title={`Nota de Pago ${data.numero}`} author="SisLider">
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.headerRow}>
          <View style={S.headerBusiness}>
            <View style={S.logoBox}>
              <Text style={S.logoMain}>L</Text>
              <Text style={S.logoSub}>IDER</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.businessName}>{NEGOCIO.nombre}</Text>
              <Text style={S.businessDetail}>{NEGOCIO.direccion}</Text>
              <Text style={S.businessDetail}>{NEGOCIO.ciudad}</Text>
              <Text style={S.businessDetail}>TELF: {NEGOCIO.telf}</Text>
              <Text style={S.businessDetail}>CORREO: {NEGOCIO.correo}</Text>
            </View>
          </View>
          <View style={S.headerDoc}>
            <Text style={S.docRuc}>RUC: {NEGOCIO.ruc}</Text>
            <Text style={S.docTitle}>NOTA VENTA</Text>
            <Text style={S.docNumber}>{data.numero}</Text>
          </View>
        </View>

        {/* ── Client section ── */}
        <View style={S.clientRow}>
          <View style={S.clientLeft}>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>Señor(es):</Text>
              <Text style={S.clientValue}>{data.alumno.apellido} {data.alumno.nombre}</Text>
            </View>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>DNI:</Text>
              <Text style={S.clientValue}>{data.alumno.dni ?? ""}</Text>
            </View>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>Dirección:</Text>
              <Text style={S.clientValue} />
            </View>
          </View>
          <View style={S.clientRight}>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>Moneda:</Text>
              <Text style={S.clientValue}>SOLES</Text>
            </View>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>Fecha Emisión:</Text>
              <Text style={S.clientValue}>{data.fechaEmision}</Text>
            </View>
            <View style={S.clientDataRow}>
              <Text style={S.clientLabel}>Nro. Guía:</Text>
              <Text style={S.clientValue} />
            </View>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={S.table}>
          <View style={S.tableHead}>
            <Text style={[S.thCell, S.colCant]}>Cant.</Text>
            <Text style={[S.thCell, S.colUnidad]}>Unidad</Text>
            <Text style={[S.thCell, S.colCodigo]}>Código</Text>
            <Text style={[S.thCell, S.colDesc]}>Descripción</Text>
            <Text style={[S.thCell, S.colPrecio]}>Precio</Text>
            <Text style={[S.thCell, S.colMonto]}>Monto</Text>
          </View>
          <View style={S.tableBody}>
            <Text style={[S.tdCell, S.colCant]}>1.00</Text>
            <Text style={[S.tdCell, S.colUnidad]}>UNIDAD</Text>
            <Text style={[S.tdCell, S.colCodigo]}>P001</Text>
            <Text style={[S.tdCell, S.colDesc]}>{data.descripcion}</Text>
            <Text style={[S.tdCell, S.colPrecio]}>{montoFmt}</Text>
            <Text style={[S.tdCell, S.colMonto]}>{montoFmt}</Text>
          </View>
        </View>

        {/* ── Amount in words ── */}
        <View style={S.sonRow}>
          <Text style={S.sonLabel}>SON:</Text>
          <Text style={S.sonText}>{son}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={S.footerRow}>
          <View style={S.footerLeft}>
            <View style={S.qrBox}>
              <Text style={S.qrText}>[ QR ]</Text>
            </View>
            <Text style={S.notaValida}>No válido como comprobante</Text>
            <Text style={S.legalText}>
              {"BIENES TRANSFERIDOS EN LA AMAZONÍA\nREGIÓN SELVA PARA SER CONSUMIDOS\nEN LA MISMA"}
            </Text>
          </View>
          <View style={S.footerRight}>
            {TOTAL_LABELS.map((label, i) => (
              <View key={label} style={S.totalRow}>
                <Text style={S.totalLabel}>{label}</Text>
                <Text style={S.totalValue}>{totalValues[i]}</Text>
              </View>
            ))}
            <View style={S.divider} />
            <View style={S.totalRowFinal}>
              <Text style={S.totalLabelFinal}>IMPORTE TOTAL S/</Text>
              <Text style={S.totalValueFinal}>{montoFmt}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
