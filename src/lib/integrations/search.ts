export async function searchWeb(
  query: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    let result = "";

    if (data.answer) {
      result += `**Summary:** ${data.answer}\n\n`;
    }

    if (data.results && data.results.length > 0) {
      result += "**Search Results:**\n\n";
      data.results.forEach(
        (
          item: { title: string; url: string; content: string },
          index: number
        ) => {
          result += `${index + 1}. **${item.title}**\n`;
          result += `   URL: ${item.url}\n`;
          result += `   ${item.content}\n\n`;
        }
      );
    }

    return result || "No results found for this query.";
  } catch (error) {
    if (error instanceof Error) {
      return `Search failed: ${error.message}`;
    }
    return "Search failed with an unknown error";
  }
}
