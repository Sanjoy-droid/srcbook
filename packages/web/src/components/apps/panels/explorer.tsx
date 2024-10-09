import { Folder } from 'lucide-react';
import { useFiles, type FileTreeType } from '../use-files';
import { FileType } from '@srcbook/shared';
import { cn } from '@srcbook/components';

export default function ExplorerPanel() {
  const { fileTree, openedFile, setOpenedFile } = useFiles();
  return <FileTree tree={fileTree} openedFile={openedFile} setOpenedFile={setOpenedFile} />;
}

type FileTreePropsType = {
  tree: FileTreeType;
  openedFile: FileType | null;
  setOpenedFile: (file: FileType) => void;
};

function FileTree({ tree, openedFile, setOpenedFile }: FileTreePropsType) {
  return (
    <ul className="pl-3 text-sm text-tertiary-foreground leading-6">
      {tree.map((entry) =>
        entry.directory ? (
          <li key={entry.name}>
            <div className="flex items-center gap-1.5">
              <Folder size={12} /> {entry.name}
            </div>
            <FileTree tree={entry.children} openedFile={openedFile} setOpenedFile={setOpenedFile} />
          </li>
        ) : (
          <li
            key={entry.name}
            className={cn(
              'transition-all',
              openedFile?.path === entry.file.path
                ? 'cursor-default text-foreground font-semibold'
                : 'cursor-pointer hover:text-foreground',
            )}
          >
            <button onClick={() => setOpenedFile(entry.file)}>{entry.name}</button>
          </li>
        ),
      )}
    </ul>
  );
}
