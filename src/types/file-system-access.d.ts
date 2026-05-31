// Minimal ambient declarations for the File System Access API members we use in
// folder sync. Some of these are not present in the project's current lib.dom
// typings, so we augment them here (only the members we actually call) instead
// of casting to `any`.

export {};

declare global {
  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemDirectoryHandle {
    queryPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission?(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
  }

  interface Window {
    showDirectoryPicker?(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: FileSystemHandle | string;
    }): Promise<FileSystemDirectoryHandle>;
  }
}
