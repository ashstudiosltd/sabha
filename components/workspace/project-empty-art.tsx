import { FolderCode, GitBranch, GitCommitHorizontal } from "lucide-react";
/** Original monochrome illustration using the existing Projects icon family. */
export default function ProjectEmptyArt() {
 return <div className="dv-empty-art" aria-hidden="true"><span className="dv-art-line"/><span className="dv-art-tile dv-art-left"><GitBranch size={22} strokeWidth={1.5}/></span><span className="dv-art-tile dv-art-main"><FolderCode size={38} strokeWidth={1.25}/></span><span className="dv-art-tile dv-art-right"><GitCommitHorizontal size={22} strokeWidth={1.5}/></span></div>;
}
