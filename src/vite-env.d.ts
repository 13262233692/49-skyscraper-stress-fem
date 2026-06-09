/// <reference types="vite/client" />

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '@/workers/femParser.worker.ts' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
