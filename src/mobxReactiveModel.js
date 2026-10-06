import { observable, configure } from "mobx";

configure({ enforceActions: "never", });

const model = {

    // ========== Fake data ==========

    // Current logged-in user (replace with the user returned by the login API later)
    user: {
        id: "u1",
        name: "Yuewei",
        email: "yuewei@example.com",
        photoURL: null,     // null shows an empty white avatar
    },

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

    // Collaborators on the current canvas (replace with WebSocket data later)
    collaborators: [
        { id: "u1", name: "Yuewei" },
        { id: "u2", name: "Friend" },
    ],


    // ========== Page state ==========

    // Login
    loginEmail: "",
    loginPassword: "",

    // Search and filter for Gallery / My Work
    searchText: "",
    selectedCategory: null,     // null means no filter

    // Profile
    editingField: null,         // field being edited: "name" / "email" / null
    profileDraft: "",           // input value while editing

    // Canvas
    currentTool: "shape",       // left panel: "shape" / "stroke"
    selectedShape: null,        // "triangle" / "star" / "circle" / "square"
    strokeColor: "#000000",
    strokeWidth: 4,
    strokeType: "pencil",       // "pencil" / "pen"


    // ========== Methods ==========

    // Login
    setLoginEmail(email){ this.loginEmail = email; },
    setLoginPassword(password){ this.loginPassword = password; },

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

    // My Work only shows the current user's canvases
    getMyCanvases(){
        const userId = this.user.id;
        function isMineCB(canvas){ return canvas.owner === userId; }
        return this.filterCanvases(this.canvases.filter(isMineCB));
    },

    // Profile
    startEdit(field){
        this.editingField = field;
        this.profileDraft = this.user[field];
    },
    setProfileDraft(text){ this.profileDraft = text; },
    saveEdit(){
        this.user[this.editingField] = this.profileDraft;
        this.editingField = null;
    },
    setPhotoURL(url){ this.user.photoURL = url; },

    // Canvas
    setCurrentTool(tool){ this.currentTool = tool; },
    selectShape(shape){ this.selectedShape = shape; },
    setStrokeColor(color){ this.strokeColor = color; },
    setStrokeWidth(width){ this.strokeWidth = width; },
    setStrokeType(type){ this.strokeType = type; },
};

export const reactiveModel = observable(model);

// for debug purpose
window.myModel = reactiveModel;