export const devServer = (route: string) => import.meta.env.VITE_DEVSEVER + route;
export const staticLoginCred = {
    username: import.meta.env.VITE_STATIC_USERNAME,
    sesionId: import.meta.env.VITE_STATIC_SESSION
}