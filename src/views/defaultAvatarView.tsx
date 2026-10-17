// The picture shown for someone without a profile photo: a grey silhouette on a light circle.
// It is drawn inline (no image file to load or to go missing) and takes its size from .profile-avatar.
export function DefaultAvatar(){
    return (
        <svg className="profile-avatar" viewBox="0 0 140 140" role="img" aria-label="Default profile photo">
            <defs>
                <clipPath id="default-avatar-clip"><circle cx="70" cy="70" r="70"/></clipPath>
            </defs>
            <g clipPath="url(#default-avatar-clip)">
                <rect width="140" height="140" fill="#e2e2e2"/>
                <circle cx="70" cy="54" r="24" fill="#a8a8a8"/>
                <ellipse cx="70" cy="128" rx="46" ry="36" fill="#a8a8a8"/>
            </g>
        </svg>
    );
}
