/* Script för bildoptimering som läser original från src/images/original 
och skriver optimerade webp till public/images */

/* Importerar sharp och Node-moduler som används
för att läsa mappar och optimera bilder */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

/* Absoluta sökvägar till in- och utmappar */
const inputDir = path.resolve("src/images/original");
const outputDir = path.resolve("public/images");

/**
 * Säkerställer att en katalog finns, annars skapas den.
 * @param {string} dir - Sökvägen till katalogen.
 */
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

/**
 * Läser bilder från src/images/original,
 * optimerar dem och sparar WebP-versioner i public/images.
 */
async function run() {

    console.log("Startar bildoptimering...");

    await ensureDir(outputDir);

    /* Hämtar lista med filnamn i originalmappen, ser till att endast bilder läses */
    const files = (await fs.readdir(inputDir)).filter(file =>
        /\.(jpg|jpeg|png)$/i.test(file)
    );

    /* Loopar genom varje bildfil */
    for (const file of files) {
        const inputPath = path.join(inputDir, file);

        /* Plockar ut filnamn utan ändelse */
        const fileName = path.parse(file).name;

        /* Avgör om bilden är en headerbild baserat på filnamnet */
        const isHeader = fileName.toLowerCase().startsWith("header");

        /* Skapar nytt filnamn med .webp */
        const outputName = fileName + ".webp";
        const outputPath = path.join(outputDir, outputName);

        /* Olika inställningar beroende på bildtyp */
        const width = isHeader ? 1600 : 900;
        const quality = isHeader ? 80 : 70;

        /* Konverterar bilderna till WebP och sparar dem */
        await sharp(inputPath)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality })
            .toFile(outputPath);

            console.log(`Optimerad: ${file} → ${outputName}`);
    }

    console.log("Bildoptimering klar.");
}

/* Kör scriptet och fångar eventuella fel */
run().catch((err) => {
    console.error("Fel i scriptet:", err);
    process.exit(1);
});
