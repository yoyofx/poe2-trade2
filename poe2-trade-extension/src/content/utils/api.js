import { extractPrefixesAndSuffixes } from "../logic/parser.js";

export async function fetchAndAnalyze(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "fetchUrl", url: url }, (response) => {
      if (response && response.success) {
        try {
          // 从 HTML 中提取 script 标签中的 ModsView JSON 参数
          const html = response.data;

          // 使用正则表达式匹配 new ModsView({...})
          const regex = /new\s+ModsView\s*\(\s*(\{[\s\S]*?\})\s*\)/;
          const match = html.match(regex);

          if (!match || !match[1]) {
            reject("无法找到 ModsView 的 JSON 参数");
            return;
          }

          // 提取 JSON 字符串
          const jsonString = match[1];

          // 解析 JSON
          const modsData = JSON.parse(jsonString);
          console.log("物品数据 原始json:", modsData);
          // 将解析后的数据传递给 extractPrefixesAndSuffixes
          const result = extractPrefixesAndSuffixes(modsData);

          resolve(result);
        } catch (error) {
          reject("解析 ModsView JSON 失败: " + error.message);
        }
      } else {
        reject(response ? response.error : "Unknown error");
      }
    });
  });
}
