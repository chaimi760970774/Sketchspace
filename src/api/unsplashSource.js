const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const BASE_URL = "https://api.unsplash.com";

// search photos by keyword, resolves to an array of photo objects
export function searchPhotos(query){
    const url = BASE_URL + "/search/photos?" + new URLSearchParams({ query: query, per_page: 12 });

    return fetch(url, { headers: { Authorization: "Client-ID " + ACCESS_KEY } })
        .then(gotResponseACB)
        .then(getResultsACB);

    function gotResponseACB(response){
        if (!response.ok) throw new Error("Unsplash error " + response.status);
        return response.json();
    }
    function getResultsACB(data){ return data.results; }
}

// required by Unsplash guidelines: tell Unsplash when a photo is actually used
export function trackDownload(downloadLocation){
    return fetch(downloadLocation, { headers: { Authorization: "Client-ID " + ACCESS_KEY } });
}