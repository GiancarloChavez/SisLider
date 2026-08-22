import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { S, C } from "../styles";
import type { ReporteCursosData } from "../queries";

const DIA_ABREV: Record<string, string> = {
  Lunes:"Lu", Martes:"Ma", Miércoles:"Mi", Jueves:"Ju", Viernes:"Vi", Sábado:"Sa", Domingo:"Do",
};

export function ReporteCursos({ data }: { data: ReporteCursosData }) {
  return (
    <Document title="Reporte de Cursos y Horarios" author="SisLider">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.headerBrand}>SISLIDER · SISTEMA DE GESTIÓN ACADÉMICA</Text>
            <Text style={S.headerTitle}>Reporte de Cursos y Horarios</Text>
            <Text style={S.headerSubtitle}>Alumnos matriculados por horario</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerDate}>Generado el {data.generadoEn}</Text>
          </View>
        </View>

        {/* ── Resumen general ─────────────────────────────────────── */}
        <View style={[S.section, { marginBottom: 14 }]}>
          <Text style={S.sectionTitle}>Resumen general</Text>
          <View style={S.infoRow}>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Total cursos</Text>
              <Text style={S.infoValue}>{data.totalCursos}</Text>
            </View>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Cursos activos</Text>
              <Text style={S.infoValue}>{data.cursos.filter((c) => c.activo).length}</Text>
            </View>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Total horarios</Text>
              <Text style={S.infoValue}>
                {data.cursos.reduce((s, c) => s + c.horarios.length, 0)}
              </Text>
            </View>
            <View style={S.infoBoxLast}>
              <Text style={S.infoLabel}>Alumnos activos</Text>
              <Text style={S.infoValue}>{data.totalAlumnosActivos}</Text>
            </View>
          </View>
        </View>

        {/* ── Por curso ───────────────────────────────────────────── */}
        {data.cursos.map((curso) => (
          <View key={curso.nombre} style={[S.section, S.courseCard]}>
            {/* Course header */}
            <View style={S.courseCardHeader}>
              <View>
                <Text style={S.courseCardHeaderText}>
                  {curso.nombre}
                </Text>
                <Text style={S.courseCardHeaderSub}>
                  S/{curso.precioMensual.toFixed(2)}/mes
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {curso.activo
                  ? <Text style={S.badgeGreen}>Activo</Text>
                  : <Text style={S.badgeGray}>Inactivo</Text>
                }
                <Text style={[S.courseCardHeaderSub, { marginTop: 3 }]}>
                  {curso.horarios.reduce((s, h) => s + h.alumnosActivos, 0)} alumno(s)
                </Text>
              </View>
            </View>

            <View style={{ padding: 8 }}>
              {curso.horarios.length === 0 ? (
                <Text style={{ fontSize: 8, color: C.muted }}>Sin horarios activos.</Text>
              ) : (
                curso.horarios.map((horario, hi) => {
                  const diasStr = horario.dias.map((d) => DIA_ABREV[d] ?? d).join(" · ");
                  const ocupacion = horario.capacidad > 0
                    ? Math.round((horario.alumnosActivos / horario.capacidad) * 100)
                    : 0;

                  return (
                    <View
                      key={horario.id}
                      style={[
                        {
                          borderWidth: 0.5,
                          borderColor: C.border,
                          borderStyle: "solid",
                          borderRadius: 3,
                          marginBottom: hi < curso.horarios.length - 1 ? 6 : 0,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      {/* Schedule subheader */}
                      <View style={{
                        flexDirection:    "row",
                        justifyContent:   "space-between",
                        alignItems:       "center",
                        backgroundColor:  C.bg,
                        paddingHorizontal: 8,
                        paddingVertical:   5,
                        borderBottomWidth: 0.5,
                        borderBottomColor: C.border,
                        borderBottomStyle: "solid",
                      }}>
                        <View>
                          <Text style={[S.tableCellBold, { fontSize: 9 }]}>
                            {diasStr}  {horario.horaInicio}–{horario.horaFin}
                          </Text>
                          <Text style={[S.tableCellMuted, { marginTop: 1 }]}>
                            {horario.docente}  ·  {horario.aula}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[S.tableCellBold]}>
                            {horario.alumnosActivos}/{horario.capacidad} alumnos
                          </Text>
                          <Text style={[S.tableCellMuted, { marginTop: 1 }]}>
                            {ocupacion}% ocupado
                          </Text>
                        </View>
                      </View>

                      {/* Student list */}
                      {horario.alumnos.length === 0 ? (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                          <Text style={{ fontSize: 8, color: C.muted }}>
                            Sin alumnos matriculados.
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 6 }}>
                          {horario.alumnos.map((alumno, ai) => (
                            <View
                              key={ai}
                              style={{
                                width: "50%",
                                paddingHorizontal: 2,
                                paddingVertical: 2,
                              }}
                            >
                              <Text style={S.tableCell}>
                                {ai + 1}. {alumno.apellido}, {alumno.nombre}
                                {alumno.dni ? (
                                  <Text style={S.tableCellMuted}> — {alumno.dni}</Text>
                                ) : null}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ))}

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
