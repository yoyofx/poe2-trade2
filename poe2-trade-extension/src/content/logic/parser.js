import { findFilter } from "../utils/state.js";

export function toSign(str) {
  if (!str) return "";
  let s = str.replace(/<\/?[^>]+(>|$)/g, "");
  s = s.replace(/([-|+]?\d+(?:\.\d+)?)/g, "#");
  s = s
    .replace(/\(#&ndash;#\)/g, "#")
    .replace(/\(#–#\)/g, "#")
    .replace(/\(#—#\)/g, "#");
  s = s.replace(/\+\s*#/g, "#");
  return s.trim();
}

export function getMultiselectElements() {
  const advancedPane = document.querySelector(".search-advanced-pane.brown");
  if (!advancedPane) {
    console.warn("Multiselect: .search-advanced-pane.brown not found");
    return [];
  }

  const filterPadded = advancedPane.querySelector(".filter.filter-padded");
  if (!filterPadded) {
    console.warn("Multiselect: .filter.filter-padded not found");
    return [];
  }

  const multiselectElements = filterPadded.querySelectorAll(
    ".multiselect__element",
  );
  return multiselectElements;
}

export function extractValuesFromContent(filter, content) {
  if (!filter || !content) {
    return null;
  }

  try {
    const cleanedFilter = filter.replace(/\s*\([^)]*\)/g, "");

    let processedFilter = cleanedFilter;
    processedFilter = processedFilter.replace(/#/g, "\x00PLACEHOLDER\x00");

    let isInverted = false;
    if (cleanedFilter.includes("提高") && content.includes("降低")) {
      processedFilter = processedFilter.replace("提高", "降低");
      isInverted = true;
    } else if (cleanedFilter.includes("降低") && content.includes("提高")) {
      processedFilter = processedFilter.replace("降低", "提高");
      isInverted = true;
    }

    let escapedFilter = processedFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    escapedFilter = escapedFilter.replace(/\s+/g, "\\s+");
    escapedFilter = escapedFilter.replace(
      /\\\+\x00PLACEHOLDER\x00/g,
      "[+\\-]?(\\d+(?:\\.\\d+)?)",
    );
    escapedFilter = escapedFilter.replace(
      /\x00PLACEHOLDER\x00/g,
      "[+\\-]?(\\d+(?:\\.\\d+)?)",
    );

    const regex = new RegExp(escapedFilter);
    const match = content.match(regex);

    if (!match) {
      return null;
    }

    const values = [];
    for (let i = 1; i < match.length; i++) {
      let num = parseFloat(match[i]);
      if (!isNaN(num)) {
        if (isInverted) {
          num = -num;
        }
        values.push(num);
      }
    }
    return values.length > 0 ? values : null;
  } catch (error) {
    console.error("Error extracting values from content:", error);
    return null;
  }
}

export function parseSkill(div) {
  const lcs = div.querySelector(".lc.s");
  const img = div.querySelector("img");
  const type = lcs ? lcs.dataset.field : null;
  const imageUrl = img ? img.src : null;

  let level = null;
  let name = "";

  if (lcs) {
    const spans = lcs.querySelectorAll("span");
    const textSpan = spans.length > 0 ? spans[spans.length - 1] : null;

    if (textSpan) {
      const text = textSpan.innerText;
      const levelMatch = text.match(/等级\s*(\d+)/);
      if (levelMatch) {
        level = parseInt(levelMatch[1], 10);
        name = text.replace(levelMatch[0], "").trim();
      } else {
        name = text;
      }
    }
  }

  return {
    type,
    imageUrl,
    level,
    name,
  };
}

export function parseAffix(div) {
  const lcl = div.querySelector(".lc.l");
  const lcs = div.querySelector(".lc.s");

  const content = lcs ? lcs.innerText : "";
  const type = lcs ? lcs.dataset.field : null;

  const tagText = lcl ? lcl.innerHTML : "";
  const parts = tagText.split("+").map((t) => t.trim());

  const affixChildren = parts
    .map((tag) => {
      const tierMatch = tag.match(/([PS])(\d+)/i);
      const rangePattern =
        /(-?\d+(?:\.\d+)?)\s*[—\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/g;
      const rangeMatches = [...tag.matchAll(rangePattern)];

      if (!tierMatch && rangeMatches.length === 0) return null;

      const child = {};

      if (tierMatch) {
        child.isPrefix = tierMatch[1].toUpperCase() === "P";
        child.tier = parseInt(tierMatch[2], 10);
      } else {
        child.isPrefix = null;
        child.tier = null;
      }

      if (rangeMatches.length > 0) {
        child.tierRange = rangeMatches.map((match) => ({
          min: parseFloat(match[1]),
          max: parseFloat(match[2]),
        }));
      } else {
        child.tierRange = [];
      }

      return child;
    })
    .filter(Boolean);

  const firstChild = affixChildren[0] || {
    isPrefix: null,
    tier: null,
    tierRange: [],
  };

  const filter = findFilter(type);
  const values = extractValuesFromContent(filter, content);

  return {
    isPrefix: firstChild.isPrefix,
    tier: firstChild.tier,
    tierRange: firstChild.tierRange,
    type: type,
    filter: filter,
    content: content,
    values: values,
    affixChildren: affixChildren.length > 1 ? affixChildren : null,
  };
}

export function extractPrefixesAndSuffixes(data) {
  const prefixMap = new Map();
  const suffixMap = new Map();

  const sources = ["normal", "desecrated", "essence", "perfect_essence"];

  sources.forEach((source) => {
    if (data[source] && Array.isArray(data[source])) {
      data[source].forEach((mod) => {
        const correctGroup = mod.ModFamilyList[0] || "Unknown";

        const sign = toSign(mod.str);
        const modEntry = {
          source,
          sign: sign,
          CorrectGroup: correctGroup,
          ModFamilyList: mod.ModFamilyList,
        };

        const uniqueKey = `${sign}|${correctGroup}`;

        if (mod.ModGenerationTypeID === "1") {
          if (!prefixMap.has(uniqueKey)) {
            prefixMap.set(uniqueKey, modEntry);
          }
        } else if (mod.ModGenerationTypeID === "2") {
          if (!suffixMap.has(uniqueKey)) {
            suffixMap.set(uniqueKey, modEntry);
          }
        }
      });
    }
  });

  return {
    prefixes: Array.from(prefixMap.values()),
    suffixes: Array.from(suffixMap.values()),
  };
}

export function extractItemData(row, itemId, searchCode) {
  const nameEl = row.querySelector(".itemName") || row.querySelector(".name");
  const typeEl =
    row.querySelector(".itemType") || row.querySelector(".typeLine");
  const priceEl =
    row.querySelector(".priceBlock") || row.querySelector(".price");
  const playerEl =
    row.querySelector(".posted-by") || row.querySelector(".profile-link > a");
  const iconEl = row.querySelector(".icon img");
  const socketEls = row.querySelectorAll(".sockets .socket");
  const socketCount = socketEls ? socketEls.length : 0;

  const category = row.querySelector(".content .property").innerText;
  const affixes = Array.from(row.querySelectorAll(".explicitMod")).map((el) =>
    parseAffix(el),
  );
  const implicits = Array.from(row.querySelectorAll(".implicitMod")).map((el) =>
    parseAffix(el),
  );
  const runes = Array.from(row.querySelectorAll(".runeMod")).map((el) =>
    parseAffix(el),
  );
  const desecrates = Array.from(row.querySelectorAll(".desecratedMod")).map(
    (el) => parseAffix(el),
  );
  const skills = Array.from(row.querySelectorAll(".skills .skill")).map((el) =>
    parseSkill(el),
  );

  let name = nameEl ? nameEl.innerText : "";
  let typeName = typeEl ? typeEl.innerText : "";

  let a = {
    id: itemId,
    name: name === typeName ? name : name + " " + typeName,
    itemName: name,
    typeName: typeName,
    nameCss: nameEl ? `color: ${window.getComputedStyle(nameEl).color}` : "",
    imageUrl: iconEl ? iconEl.src : "",
    sockets: socketCount,
    price: priceEl ? priceEl.innerText : "Unknown Price",
    playerName: playerEl ? playerEl.innerText : null,
    affixes: affixes,
    base: implicits,
    runes: runes,
    desecrates: desecrates,
    skills: skills,
    category: category,
    timestamp: Date.now(),
    searchCode: searchCode,
  };
  console.log("收藏数据：", a);
  return a;
}
