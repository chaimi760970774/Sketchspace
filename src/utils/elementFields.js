// The fields of an element that the server stores. Frontend-only fields like `status` are never sent.

const BASE_FIELDS = ["x", "y", "width", "height", "rotation", "zIndex"];
const TYPE_FIELDS = {
    shape: ["shape", "color"],
    photo: ["url", "photographer", "photographerLink"],
    // `shape` is the outline the photo was cut with
    cutout: ["shape", "url", "photographer", "photographerLink", "cutWidth", "cutHeight", "photo"],
};
const UPDATABLE_FIELDS = [...new Set([...BASE_FIELDS, ...TYPE_FIELDS.shape, ...TYPE_FIELDS.photo, ...TYPE_FIELDS.cutout])];

function pickFields(source, fields){
    const result = {};
    function copyCB(field){ if (source[field] !== undefined) result[field] = source[field]; }
    fields.forEach(copyCB);
    return result;
}

// a new element as the server expects it
export function toServerElement(element){
    return { type: element.type, ...pickFields(element, [...BASE_FIELDS, ...(TYPE_FIELDS[element.type] || [])]) };
}

// changed fields only, without id, type or status
export function toServerChanges(changes){
    return pickFields(changes, UPDATABLE_FIELDS);
}

// an element from the server, marked as saved
export function toLocalElement(serverElement){
    return {
        id: serverElement.id,
        type: serverElement.type,
        ...pickFields(serverElement, [...BASE_FIELDS, ...(TYPE_FIELDS[serverElement.type] || [])]),
        status: "saved",
    };
}
