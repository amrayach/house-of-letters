/**
 * Site copy — single source of truth for landing-page prose (bilingual).
 *
 * Canonical facts + terminology: docs/superpowers/specs/2026-07-02-brutalist-archival-redesign-design.md §3–4.
 * Intro paragraphs are the client's text verbatim (EN spelling aligned to "Sednaya").
 * Arabic subtitle/cta/aboutLabel are drafts pending client confirmation.
 */
export const SITE_TITLE = Object.freeze({
  ar: "بيت الأحلام",
  en: "House of Dreams",
});

export const LANDING_COPY = Object.freeze({
  en: Object.freeze({
    dir: "ltr",
    subtitle: "Archival and audiovisual project about political persecution in Syria.",
    intro: Object.freeze([
      "House of Dreams is an archival and audiovisual project built around the prison writings and handmade objects of Ahed Sheikh Hassan, a Syrian political prisoner who spent seven years in Sednaya Prison between 1987 and 1994.",
      "During his imprisonment, Ahed wrote on small, delicate sheets of paper and smuggled his writings out after his release. These texts record fragments of daily life, thought, fear, tenderness, and survival inside one of Syria’s most violent prisons.",
      "The project brings together scanned papers, voice recordings, family memory, and a small model house that Ahed made in prison and gave to his children. It is both a personal family archive and a public act of remembrance.",
      "Visitors can move through the writings as if through an empty exhibition space: reading, listening, and encountering the weight of these fragile papers.",
    ]),
    cta: "Enter the Archive",
    note: "A project by Alaa Sheikh Hassan, AKA Alaa Hassan, based on the archive of Ahed Sheikh Hassan.",
    support: "Supported by Heinrich-Böll-Stiftung.",
    aboutLabel: "About the project",
  }),
  ar: Object.freeze({
    dir: "rtl",
    subtitle: "مشروع أرشيفي وسمعي بصري عن الاضطهاد السياسي في سوريا.",
    intro: Object.freeze([
      "بيت الأحلام مشروع أرشيفي وسمعي بصري مبني حول مذكرات ومصنوعات يدوية أنتجها عهد الشيخ حسن، المعتقل السياسي السوري الذي قضى سبع سنوات في سجن صيدنايا بين عامي 1987 و1994.",
      "خلال اعتقاله، كتب عهد على أوراق صغيرة وناعمة، وهرّب كتاباته معه بعد خروجه من السجن. تسجّل هذه النصوص شذرات من الحياة اليومية، والتفكير، والخوف، والحنان، والنجاة داخل واحد من أكثر السجون السورية عنفاً.",
      "يجمع المشروع بين صور الأوراق، والتسجيلات الصوتية، والذاكرة العائلية، ونموذج بيت صغير صنعه عهد في السجن وأهداه لأطفاله. هو في الوقت نفسه أرشيف عائلي شخصي وفعل عام لحفظ الذاكرة.",
      "يمكن للزائر أن يتجوّل بين المذكرات كما لو أنه يدخل مساحة عرض فارغة، يقرأ ويستمع ويواجه ثقل هذه الأوراق الهشّة.",
    ]),
    cta: "ادخل الأرشيف",
    note: "مشروع لعلاء الشيخ حسن، المعروف أيضاً باسم علاء حسن، مبني على أرشيف عهد الشيخ حسن.",
    support: "بدعم من مؤسسة هاينريش بول.",
    aboutLabel: "عن المشروع",
  }),
});
