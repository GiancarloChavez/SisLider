import { StyleSheet } from "@react-pdf/renderer";

export const C = {
  black:    "#18181b",
  text:     "#3f3f46",
  muted:    "#71717a",
  border:   "#e4e4e7",
  bg:       "#f9fafb",
  white:    "#ffffff",
  green:    "#065f46",
  greenBg:  "#d1fae5",
  red:      "#991b1b",
  redBg:    "#fee2e2",
  amber:    "#92400e",
  amberBg:  "#fef3c7",
  blue:     "#1e40af",
  blueBg:   "#dbeafe",
};

export const S = StyleSheet.create({
  // ── Page ────────────────────────────────────────────────────────────────────
  page: {
    fontFamily:        "Helvetica",
    fontSize:          9,
    color:             C.text,
    backgroundColor:   C.white,
    paddingTop:        36,
    paddingBottom:     44,
    paddingHorizontal: 36,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "flex-start",
    marginBottom:    16,
    paddingBottom:   10,
    borderBottomWidth: 2,
    borderBottomColor: C.black,
    borderBottomStyle: "solid",
  },
  headerBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize:   8,
    color:      C.muted,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize:   18,
    color:      C.black,
    lineHeight: 1.15,
  },
  headerSubtitle: {
    fontSize:   9,
    color:      C.muted,
    marginTop:  2,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  headerDate: {
    fontSize:   7.5,
    color:      C.muted,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily:     "Helvetica-Bold",
    fontSize:       7,
    color:          C.muted,
    textTransform:  "uppercase",
    letterSpacing:  0.8,
    marginBottom:   5,
    paddingBottom:  3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid",
  },

  // ── Info grid ────────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    marginBottom:  6,
  },
  infoBox: {
    flex:            1,
    backgroundColor: C.bg,
    borderWidth:     0.5,
    borderColor:     C.border,
    borderStyle:     "solid",
    borderRadius:    3,
    padding:         7,
    marginRight:     6,
  },
  infoBoxLast: {
    flex:            1,
    backgroundColor: C.bg,
    borderWidth:     0.5,
    borderColor:     C.border,
    borderStyle:     "solid",
    borderRadius:    3,
    padding:         7,
  },
  infoLabel: {
    fontSize:      7,
    color:         C.muted,
    marginBottom:  2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize:   9,
    color:      C.black,
  },
  infoValueNormal: {
    fontSize: 9,
    color:    C.text,
  },

  // ── Table ────────────────────────────────────────────────────────────────────
  table: {
    width:       "100%",
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: "solid",
    borderRadius: 3,
  },
  tableHead: {
    flexDirection:     "row",
    backgroundColor:   C.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid",
    paddingVertical:   5,
    paddingHorizontal: 8,
  },
  tableHeadCell: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      7,
    color:         C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection:     "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid",
    paddingVertical:   5,
    paddingHorizontal: 8,
    alignItems:        "center",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableRowLast: {
    flexDirection:   "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems:      "center",
  },
  tableRowTotal: {
    flexDirection:     "row",
    backgroundColor:   C.bg,
    borderTopWidth:    1,
    borderTopColor:    C.border,
    borderTopStyle:    "solid",
    paddingVertical:   6,
    paddingHorizontal: 8,
    alignItems:        "center",
  },
  tableCell: {
    fontSize: 8.5,
    color:    C.text,
  },
  tableCellBold: {
    fontFamily: "Helvetica-Bold",
    fontSize:   8.5,
    color:      C.black,
  },
  tableCellMuted: {
    fontSize: 8,
    color:    C.muted,
  },

  // ── Summary boxes ────────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    marginBottom:  10,
  },
  summaryBox: {
    flex:            1,
    borderWidth:     0.5,
    borderColor:     C.border,
    borderStyle:     "solid",
    borderRadius:    3,
    padding:         10,
    alignItems:      "center",
    marginRight:     6,
  },
  summaryBoxLast: {
    flex:        1,
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: "solid",
    borderRadius: 3,
    padding:     10,
    alignItems:  "center",
  },
  summaryLabel: {
    fontSize:     7.5,
    color:        C.muted,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: "Helvetica-Bold",
    fontSize:   14,
    color:      C.black,
  },
  summaryValueGreen: {
    fontFamily: "Helvetica-Bold",
    fontSize:   14,
    color:      "#059669",
  },
  summaryValueRed: {
    fontFamily: "Helvetica-Bold",
    fontSize:   14,
    color:      "#dc2626",
  },
  summaryValueAmber: {
    fontFamily: "Helvetica-Bold",
    fontSize:   14,
    color:      "#d97706",
  },

  // ── Badges ───────────────────────────────────────────────────────────────────
  badgeGreen: {
    fontFamily:       "Helvetica-Bold",
    fontSize:         7,
    color:            C.green,
    backgroundColor:  C.greenBg,
    borderRadius:     8,
    paddingHorizontal: 5,
    paddingVertical:  1.5,
  },
  badgeRed: {
    fontFamily:       "Helvetica-Bold",
    fontSize:         7,
    color:            C.red,
    backgroundColor:  C.redBg,
    borderRadius:     8,
    paddingHorizontal: 5,
    paddingVertical:  1.5,
  },
  badgeAmber: {
    fontFamily:       "Helvetica-Bold",
    fontSize:         7,
    color:            C.amber,
    backgroundColor:  C.amberBg,
    borderRadius:     8,
    paddingHorizontal: 5,
    paddingVertical:  1.5,
  },
  badgeBlue: {
    fontFamily:       "Helvetica-Bold",
    fontSize:         7,
    color:            C.blue,
    backgroundColor:  C.blueBg,
    borderRadius:     8,
    paddingHorizontal: 5,
    paddingVertical:  1.5,
  },
  badgeGray: {
    fontFamily:       "Helvetica-Bold",
    fontSize:         7,
    color:            C.muted,
    backgroundColor:  C.border,
    borderRadius:     8,
    paddingHorizontal: 5,
    paddingVertical:  1.5,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position:  "absolute",
    bottom:    18,
    left:      36,
    right:     36,
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    borderTopStyle: "solid",
    paddingTop:     5,
  },
  footerText: {
    fontSize: 7,
    color:    C.muted,
  },

  // ── Misc ─────────────────────────────────────────────────────────────────────
  spacer: {
    marginBottom: 8,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: "solid",
    marginVertical:    8,
  },
  courseCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 10,
    overflow:    "hidden",
  },
  courseCardHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    backgroundColor: C.black,
    paddingHorizontal: 10,
    paddingVertical:   7,
  },
  courseCardHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize:   10,
    color:      C.white,
  },
  courseCardHeaderSub: {
    fontSize: 8,
    color:    "#a1a1aa",
  },
});
