import type { UnsplashFilters, UnsplashPhoto } from "/src/model/types.ts";

const ACCESS_KEY: string = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const BASE_URL = "https://api.unsplash.com";

interface SearchResponse {
    results: UnsplashPhoto[];
}

// search photos by keyword, resolves to an array of photo objects
// filters: "any" means no filter, so that parameter is left out
export function searchPhotos(query: string, filters: UnsplashFilters): Promise<UnsplashPhoto[]> {
    const orientationParam: Record<string, string> = filters.orientation === "any" ? {} : { orientation: filters.orientation };
    const colorParam: Record<string, string> = filters.color === "any" ? {} : { color: filters.color };
    const params: Record<string, string> = { query: query, per_page: "12", ...orientationParam, ...colorParam };
    const url = BASE_URL + "/search/photos?" + new URLSearchParams(params);

    return fetch(url, { headers: { Authorization: "Client-ID " + ACCESS_KEY } })
        .then(gotResponseACB)
        .then(getResultsACB);

    // the JSON is trusted to have the shape Unsplash documents; it is not checked at runtime
    function gotResponseACB(response: Response): Promise<SearchResponse> {
        if (!response.ok) throw new Error("Unsplash error " + response.status);
        return response.json();
    }
    function getResultsACB(data: SearchResponse): UnsplashPhoto[] { return data.results; }
}

// required by Unsplash guidelines: tell Unsplash when a photo is actually used
export function trackDownload(downloadLocation: string): Promise<Response> {
    return fetch(downloadLocation, { headers: { Authorization: "Client-ID " + ACCESS_KEY } });
}
