// Seed deshabilitado — no se usa en producción.
// Para poblar datos de prueba, crear el seed manualmente si es necesario.
async function main() {
  console.log("Seed deshabilitado. No se realizaron cambios.");
}

main().catch((e) => { console.error(e); process.exit(1); });
