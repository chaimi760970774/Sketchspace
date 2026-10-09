// canvas list, search, folders
export const galleryModel = {

    // ========== Fake data ==========

    // All canvases (replace with data from the REST API later)
    // owner is the creator's user id; My Work only shows canvases owned by the current user
    // isShared: only shared canvases are shown in the Gallery
    // folderId: the folder the canvas is in, null = not in any folder (only shown in "All")
    canvases: [
        { id: "c1", title: "Forest Walk",   owner: "u1", isShared: true,  folderId: "f1" },
        { id: "c2", title: "Funny Faces",   owner: "u1", isShared: false, folderId: null },
        { id: "c3", title: "Color Blocks",  owner: "u2", isShared: true,  folderId: null },
        { id: "c4", title: "Cat Party",     owner: "u3", isShared: true,  folderId: null },
        { id: "c5", title: "Ocean Dream",   owner: "u2", isShared: false, folderId: null },
        { id: "c6", title: "Shape Monster", owner: "u1", isShared: true,  folderId: null },
    ],

    // Folders created by users (replace with data from the REST API later)
    // A folder only belongs to its owner and is only shown in their My Work
    folders: [
        { id: "f1", name: "Travel", owner: "u1" },
    ],



    // ========== Page state ==========

    // Search for Gallery / My Work
    searchText: "",

    // My Work folder tabs
    selectedFolderId: null,     // folder tab that is open, null = "All"
    dragOverTab: null,          // tab a canvas is being dragged over: "all", a folder id, or null
    newFolderOpen: false,       // true while the new folder name input is shown
    newFolderName: "",



    // ========== Methods ==========

    // Search
    setSearchText(text){ this.searchText = text; },

    filterCanvases(canvases){
        const text = this.searchText.toLowerCase();
        function matchCB(canvas){ return canvas.title.toLowerCase().includes(text); }
        return canvases.filter(matchCB);
    },

    // Gallery shows everyone's shared canvases
    getGalleryCanvases(){
        function isSharedCB(canvas){ return canvas.isShared; }
        return this.filterCanvases(this.canvases.filter(isSharedCB));
    },

    // My Work shows the current user's canvases (this.user comes from userModel),
    // only the ones in the open folder unless "All" is open
    getMyCanvases(){
        const userId = this.user.id;
        const folderId = this.selectedFolderId;
        function isMineCB(canvas){ return canvas.owner === userId; }
        function isInFolderCB(canvas){ return !folderId || canvas.folderId === folderId; }
        return this.filterCanvases(this.canvases.filter(isMineCB).filter(isInFolderCB));
    },

    // Folders
    getMyFolders(){
        const userId = this.user.id;
        function isMineCB(folder){ return folder.owner === userId; }
        return this.folders.filter(isMineCB);
    },

    selectFolder(folderId){ this.selectedFolderId = folderId; },

    openNewFolder(){
        this.newFolderOpen = true;
        this.newFolderName = "";
    },
    cancelNewFolder(){
        this.newFolderName = "";        // cleared first so a following blur does not create the folder
        this.newFolderOpen = false;
    },
    setNewFolderName(name){ this.newFolderName = name; },

    // an empty name just closes the input without creating anything
    createFolder(){
        const name = this.newFolderName.trim();
        if (name) {
            this.folders = [...this.folders, { id: crypto.randomUUID(), name: name, owner: this.user.id }];
        }
        this.cancelNewFolder();
    },

    // the folder disappears, its canvases stay and are still shown in "All"
    deleteFolder(folderId){
        function isOtherFolderCB(folder){ return folder.id !== folderId; }
        function takeOutCB(canvas){
            if (canvas.folderId !== folderId) return canvas;
            return { ...canvas, folderId: null };
        }
        this.folders = this.folders.filter(isOtherFolderCB);
        this.canvases = this.canvases.map(takeOutCB);
        if (this.selectedFolderId === folderId) this.selectedFolderId = null;
    },

    // folderId null = take the canvas out of its folder (dropped on "All")
    moveCanvasToFolder(canvasId, folderId){
        function moveCB(canvas){
            if (canvas.id !== canvasId) return canvas;
            return { ...canvas, folderId: folderId };
        }
        this.canvases = this.canvases.map(moveCB);
    },

    // Drag and drop highlight
    setDragOverTab(tab){ this.dragOverTab = tab; },
};