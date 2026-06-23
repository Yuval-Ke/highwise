# HighWise — Prompt ליצירת CSV טרק באמצעות ChatGPT

השתמש בזה בכל פעם שרוצים להכין טרק חדש ל־Admin Import.

```text
Prepare a HighWise trek import CSV for the following trek:

TREK NAME:
[write trek name here]

COUNTRY:
[write country here, usually nepal]

Requirements:
- Return only CSV.
- Do not add explanations before or after the CSV.
- Use this exact header:
countryId,trekId,trekNameEn,trekNameHe,region,trekAliases,locationId,nameEn,nameHe,altitudeMeters,order,section,locationType,aliases,needsReview,sourceNotes

Rules:
- One row per sleeping location / village / lodge stop.
- Use countryId `nepal` unless told otherwise.
- Use stable lowercase snake_case IDs.
- Keep the same trekId in all rows.
- order should follow the usual trekking direction.
- altitudeMeters must be in meters.
- aliases should be separated by semicolons.
- trekAliases should be separated by semicolons.
- needsReview should be true unless the altitude is highly reliable.
- sourceNotes should be short, e.g. "common trekking map altitude", "lodge altitude varies", "route variant".
- Include possible overnight stops, not only the most popular stops.
- If altitude differs between sources, choose a reasonable common value and set needsReview=true.
- Do not include medical advice.
- Do not include markdown fences.

Section values — use EXACTLY one of these (no other values are accepted):
- pre_trek   → for major start cities, trailheads, or access points before the route begins
- on_route   → for normal overnight stops along the main trekking route (use this for most rows)
- ascent     → for stops clearly on an upward section or summit approach
- descent    → for stops clearly on a downward return section
- side_trip  → for stops on an optional side trip or acclimatization detour

Do NOT use "main" or any other value for section.
```

## Header

```csv
countryId,trekId,trekNameEn,trekNameHe,region,trekAliases,locationId,nameEn,nameHe,altitudeMeters,order,section,locationType,aliases,needsReview,sourceNotes
```

## Example

```csv
countryId,trekId,trekNameEn,trekNameHe,region,trekAliases,locationId,nameEn,nameHe,altitudeMeters,order,section,locationType,aliases,needsReview,sourceNotes
nepal,manaslu_circuit,Manaslu Circuit,סובב מנאסלו,Manaslu,Manaslu Trek;Manaslu Circuit Trek,soti_khola,Soti Khola,סוטי קולה,710,1,pre_trek,village,Soti Khola;Sotikhola,true,common trekking stop altitude varies
nepal,manaslu_circuit,Manaslu Circuit,סובב מנאסלו,Manaslu,Manaslu Trek;Manaslu Circuit Trek,machha_khola,Machha Khola,מצ'ה קולה,900,2,on_route,village,Machha Khola;Machhakhola,true,common trekking stop altitude varies
nepal,manaslu_circuit,Manaslu Circuit,סובב מנאסלו,Manaslu,Manaslu Trek;Manaslu Circuit Trek,jagat,Jagat,ג'גאט,1340,3,on_route,village,Jagat,true,common trekking stop
```

## Valid section values (summary)

| Value      | When to use |
|------------|-------------|
| `pre_trek` | Start city, trailhead, access point before the route begins |
| `on_route` | Normal overnight stop on the main route (most common) |
| `ascent`   | Stop on an upward section or summit approach |
| `descent`  | Stop on a downward return section |
| `side_trip`| Optional side trip or acclimatization detour |

**Do not use `main` or any other value — the system will reject it.**
