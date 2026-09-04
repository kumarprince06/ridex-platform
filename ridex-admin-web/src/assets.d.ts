// Vite serves images as URLs; without this TypeScript treats the import as an error.
declare module '*.png' {
  const src: string;
  export default src;
}
