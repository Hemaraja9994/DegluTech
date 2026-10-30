# GUI refresh — open-source sources

The clinical interface extends the existing lucide-react dependency using CheckCircle2, ChevronDown and ChevronRight for completion, accordion disclosure and card navigation.

- Source: https://github.com/lucide-icons/lucide
- License: ISC, with Feather-derived portions under MIT. The installed package's full license is shipped in public/LUCIDE-LICENSE.txt.
- Accordion interaction reference: https://www.radix-ui.com/primitives/docs/components/accordion and https://github.com/radix-ui/primitives. No Radix code or dependency is copied; the small grouped navigation uses native buttons with aria-expanded, aria-controls and hidden panels.

UI scope: compact workflow groups; automatic opening of the active group; completion counts; stronger progress treatment; labelled readiness states with consistent numerals and responsive spacing; primary report export and outlined secondary actions; reduced-motion support. Clinical calculations, recorded fields, report export logic and persistence are unchanged.

Validation: TypeScript and Vite production build passed. All 47 existing clinical tests passed. Desktop report view and accordion navigation checked in the browser using the existing demo patient.

The second pass adds a dark teal masthead, patient context, live completion ring, contextual report action and a native modal section finder with Ctrl+K. Visual hierarchy was informed by the user-provided Constant Therapy reference (https://constanttherapyhealth.com/constant-therapy/); no proprietary assets or product claims were copied. Browser checks covered search filtering, report navigation, desktop layout and 390px mobile report layout with no document overflow.

Reference theme: white, coral-orange and aqua, rounded diamond frames. Typography: self-hosted Carlito Regular (400) and Bold (700), from https://github.com/google/fonts/tree/main/ofl/carlito, SIL OFL included with fonts. Shared sizes: display 32–46px; page title 26px; section 21px; card 17px; body 16px; supporting 14px; labels 12px. External Google font stylesheet removed.

Final selection: latest user reference 2 (navy/orange training layout). Navy #173451, decorative orange #f46b20, accessible orange action #be4916; white surfaces and diagonal geometry. The final typography uses self-hosted Carlito Regular/Bold. Browser verified both font weights and 390px viewport containment.
