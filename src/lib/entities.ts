// Einfache Stammdaten, die über eine gemeinsame Bearbeitungsseite gepflegt werden.
// Jede Liste lebt in der Datenbank und ist im Backoffice unter /backoffice/daten/<key> änderbar.

export type FieldType = "text" | "textarea" | "number" | "float" | "bool" | "date" | "color" | "select" | "lines" | "relation" | "multi";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: [string, string][]; // select: [Wert, Anzeige]
  relation?: "package" | "addon"; // relation: Auswahl aus Tabelle
  multi?: "series"; // multi: Mehrfachauswahl
  required?: boolean;
  wide?: boolean;
  help?: string;
};

export type Entity = {
  key: string;
  model: string; // Prisma-Modellname (klein)
  title: string;
  singular: string;
  intro: string;
  fields: Field[];
  orderBy: Record<string, "asc" | "desc">[];
  titleField: string;
  hasCode?: boolean; // erzeugt beim Anlegen einen eindeutigen Code aus dem Namen
  hasActive?: boolean;
  compact?: boolean; // alle Felder in einer Zeile
};

const sort: Field = { name: "sortOrder", label: "Reihenfolge", type: "number" };
const nameF: Field = { name: "name", label: "Name", type: "text", required: true };
const address: Field[] = [
  { name: "street", label: "Straße", type: "text" },
  { name: "zip", label: "PLZ", type: "text" },
  { name: "city", label: "Ort", type: "text" },
  { name: "country", label: "Land", type: "text" },
];

export const ENTITIES: Entity[] = [
  {
    key: "veranstalter",
    model: "organizer",
    title: "Veranstalter",
    singular: "Veranstalter",
    intro: "Kunden und Vereine, die Veranstaltungen ausrichten. Lassen sich Anfragen zuordnen.",
    titleField: "name",
    orderBy: [{ name: "asc" }],
    hasActive: true,
    fields: [
      nameF,
      { name: "contactName", label: "Ansprechpartner", type: "text" },
      { name: "email", label: "E-Mail", type: "text" },
      { name: "phone", label: "Telefon", type: "text" },
      ...address,
      { name: "vatId", label: "USt-IdNr.", type: "text" },
      { name: "notes", label: "Notizen", type: "textarea", wide: true },
    ],
  },
  {
    key: "locations",
    model: "location",
    title: "Locations",
    singular: "Location",
    intro: "Veranstaltungsorte mit den Infos, die wir für Aufbau und Technik brauchen.",
    titleField: "name",
    orderBy: [{ name: "asc" }],
    hasActive: true,
    fields: [
      nameF,
      ...address,
      { name: "contactName", label: "Ansprechpartner vor Ort", type: "text" },
      { name: "phone", label: "Telefon", type: "text" },
      { name: "power", label: "Strom", type: "textarea", help: "Anschlüsse, Absicherung, Lage" },
      { name: "internet", label: "Internet", type: "textarea" },
      { name: "trackInfo", label: "Bahn / Gelände", type: "textarea", help: "Bahnlänge, Erdwall, Regieplatz, Kabelwege" },
      { name: "notes", label: "Notizen", type: "textarea" },
    ],
  },
  {
    key: "qualifikationen",
    model: "qualification",
    title: "Qualifikationen",
    singular: "Qualifikation",
    intro: "Was Mitarbeitende können oder nachweisen (z. B. Drohnenführerschein, Elektrofachkraft).",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    hasActive: true,
    compact: true,
    fields: [nameF, sort],
  },
  {
    key: "fuehrerscheine",
    model: "licenseClass",
    title: "Führerscheinklassen",
    singular: "Führerscheinklasse",
    intro: "Führerscheinklassen für die Personalakte.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    hasActive: true,
    compact: true,
    fields: [nameF, sort],
  },
  {
    key: "positionen",
    model: "position",
    title: "Positionen",
    singular: "Position",
    intro: "Positionen, die bei einem Job besetzt werden können (Regie, Kamera, Sprecher …).",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    hasActive: true,
    compact: true,
    fields: [nameF, sort],
  },
  {
    key: "artikelkategorien",
    model: "articleCategory",
    title: "Artikelkategorien",
    singular: "Kategorie",
    intro: "Kategorien für das Inventar.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    compact: true,
    fields: [nameF, sort],
  },
  {
    key: "regeln",
    model: "bookingRule",
    title: "Buchungsregeln",
    singular: "Regel",
    intro:
      "Abhängigkeiten in der Buchung. „Mindestpaket“: Bei diesen Serien sind kleinere Pakete gesperrt. „Eigenes Angebot“: Bei dieser Kombination bekommt der Kunde einen Hinweis, die Anfrage wird trotzdem vollständig abgefragt und markiert.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }],
    hasActive: true,
    fields: [
      nameF,
      { name: "type", label: "Art", type: "select", options: [["MIN_PACKAGE", "Mindestpaket"], ["CUSTOM_OFFER", "Eigenes Angebot nötig"]] },
      { name: "seriesCodes", label: "Serien", type: "multi", multi: "series", wide: true },
      { name: "matchAll", label: "Nur wenn ALLE gewählten Serien dabei sind (sonst reicht eine)", type: "bool", wide: true },
      { name: "packageId", label: "Mindestpaket (nur bei Art Mindestpaket)", type: "relation", relation: "package" },
      { name: "message", label: "Hinweis für den Kunden", type: "textarea", required: true, wide: true },
      sort,
    ],
  },
  {
    key: "led-bespielung",
    model: "ledPlayoutOption",
    title: "LED-Bespielung",
    singular: "Bespielungsart",
    intro: "Auswahl im LED-Schritt der Buchung. Ein verknüpftes Add-on wird automatisch für alle Tage mitgebucht.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }],
    hasActive: true,
    hasCode: true,
    fields: [
      nameF,
      { name: "description", label: "Erklärung für den Kunden", type: "textarea", wide: true },
      { name: "addonId", label: "Bucht automatisch Add-on", type: "relation", relation: "addon" },
      sort,
    ],
  },
  {
    key: "plan-symbole",
    model: "planSymbol",
    title: "Plan-Symbole",
    singular: "Symbol",
    intro: "Symbole für den Plan-Editor. „Linie“ zeichnet z. B. Kabelwege, „Punkt“ setzt ein Symbol.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }],
    hasActive: true,
    compact: true,
    fields: [
      nameF,
      { name: "icon", label: "Zeichen / Emoji", type: "text", required: true },
      { name: "color", label: "Farbe", type: "color" },
      { name: "kind", label: "Art", type: "select", options: [["POINT", "Punkt"], ["LINE", "Linie"]] },
      sort,
    ],
  },
  {
    key: "checklisten",
    model: "checklistTemplate",
    title: "Checklisten-Vorlagen",
    singular: "Vorlage",
    intro: "Vorlagen, die du einem Job hinzufügst. Das Team hakt sie in der App ab.",
    titleField: "name",
    orderBy: [{ sortOrder: "asc" }],
    hasActive: true,
    fields: [nameF, sort, { name: "items", label: "Punkte (einer pro Zeile)", type: "lines", wide: true }],
  },
];

export const entityByKey = (k: string) => ENTITIES.find((e) => e.key === k);
