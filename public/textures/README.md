# Texture Credits

Tutte le texture planetarie sono state raccolte da fonti pubbliche con
licenze compatibili (CC-BY 4.0 o pubblico dominio NASA).

## Sole, Mercurio, Venere, Terra, Marte, Giove, Saturno, Urano, Nettuno

Texture equirectangolari 2K derivate dalla collezione "Solar Textures" di
Solar System Scope, basate su dati NASA (Messenger, Viking, Cassini, Hubble).

- Fonte originale: <https://www.solarsystemscope.com/textures/>
- Licenza: CC-BY 4.0 International
- Redistribuite via mirror pubblico (wangyufanshuai/solar_sim, MIT) e
  salvate localmente in `public/textures/planets/`.

## Texture hi-res (S15 · R2) — `public/textures/planets/4k/`

- `4k/earth.jpg`: albedo 4096×2048 della Terra, da NASA Blue Marble via
  repo three.js (`examples/textures/planets/earth_atmos_4096.jpg`),
  distribuito con licenza MIT (dati immagine pubblico dominio NASA).
- Le altre varianti 4K (Marte, Giove, Saturno) NON sono ridistribuibili
  via CDN (Solar System Scope blocca il download diretto con 403): per
  aggiungerle, scaricarle manualmente da
  <https://www.solarsystemscope.com/textures/> (CC-BY 4.0, con
  attribuzione), rinominarle `mars.jpg`, `jupiter.jpg`, `saturn.jpg` e
  depositarle in `public/textures/planets/4k/` — il manifest generato
  dall'hook `prebuild` le attiva automaticamente (fallback 2K se assenti).

## Normal map — `public/textures/planets/normal/`

- `earth_normal_2048.jpg`: normal map della Terra 2048×1024, dal repo
  three.js (`earth_normal_2048.jpg`, dati NASA, licenza MIT).
- Applicata solo alla Terra con `normalScale` 0.6 (Bodies.tsx).

## Anelli di Saturno

Generati proceduralmente (`scripts/make-saturn-rings.cjs`) sulla base dei
raggi reali degli anelli D/C/B/A + Cassini Division.

## Stelle di sfondo

Generate a runtime da `@react-three/drei` (`<Stars />`) — nessuna texture.