// canvas list, search, category
export const galleryModel = {

    // ========== Fake data ==========

    // All canvases (replace with data from the REST API later)
    // owner is the creator's user id; My Work only shows canvases owned by the current user
    canvases: [
        { id: "c1", title: "Forest Walk",   category: "Nature",   owner: "u1" },
        { id: "c2", title: "Funny Faces",   category: "People",   owner: "u1" },
        { id: "c3", title: "Color Blocks",  category: "Abstract", owner: "u2" },
        { id: "c4", title: "Cat Party",     category: "Animal",   owner: "u3" },
        { id: "c5", title: "Ocean Dream",   category: "Nature",   owner: "u2" },
        { id: "c6", title: "Shape Monster", category: "Abstract", owner: "u1" },
    ],

    // Canvas categories (placeholder names)
    categories: ["Nature", "People", "Abstract", "Animal"],



    // ========== Page state ==========

    // Search and filter for Gallery / My Work
    searchText: "",
    selectedCategory: null,     // null means no filter



    // ========== Methods ==========

    // Search and filter
    setSearchText(text){ this.searchText = text; },
    selectCategory(category){
        // clicking the same category again clears the filter
        if (this.selectedCategory === category) this.selectedCategory = null;
        else this.selectedCategory = category;
    },

    filterCanvases(canvases){
        const text = this.searchText.toLowerCase();
        const category = this.selectedCategory;

        function matchCB(canvas){
            const matchText = canvas.title.toLowerCase().includes(text);
            const matchCategory = !category || canvas.category === category;
            return matchText && matchCategory;
        }
        return canvases.filter(matchCB);
    },

    // Gallery shows all canvases
    getGalleryCanvases(){ return this.filterCanvases(this.canvases); },

    // My Work only shows the current user's canvases (this.user comes from userModel)
    getMyCanvases(){
        const userId = this.user.id;
        function isMineCB(canvas){ return canvas.owner === userId; }
        return this.filterCanvases(this.canvases.filter(isMineCB));
    },
};
