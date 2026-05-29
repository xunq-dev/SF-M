/// <reference types="vite/client" />

declare module "*.png?url" {
  const src: string;
  export default src;
}

declare module "*.lua?raw" {
  const src: string;
  export default src;
}
