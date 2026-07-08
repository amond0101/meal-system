// NEIS(교육정보개방포털) 공개 API — 부산기계공업고등학교 급식 정보
const ATPT_OFCDC_SC_CODE = "C10";
const SD_SCHUL_CODE = "1421117";
const DINNER_MEAL_CODE = "3"; // 1=조식, 2=중식, 3=석식

function cleanDishNames(raw: string) {
  return raw
    .split("<br/>")
    .map((dish) => dish.replace(/\s*\([\d.]+\)\s*$/, "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function fetchNeisDinnerMenu(date: string): Promise<string | null> {
  const ymd = date.replaceAll("-", "");
  const params = new URLSearchParams({
    Type: "json",
    ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE,
    MLSV_YMD: ymd,
    MMEAL_SC_CODE: DINNER_MEAL_CODE,
  });
  if (process.env.NEIS_API_KEY) {
    params.set("KEY", process.env.NEIS_API_KEY);
  }

  // Menu for a given date is effectively static once NEIS publishes it, so cache
  // per-date responses instead of hitting the external API on every page render.
  const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?${params.toString()}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const rows = data?.mealServiceDietInfo?.[1]?.row as { DDISH_NM?: string }[] | undefined;
  if (!rows || rows.length === 0 || !rows[0].DDISH_NM) return null;

  return cleanDishNames(rows[0].DDISH_NM);
}
