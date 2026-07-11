export interface DemoState {
    enabled: boolean;
    ready: boolean;
    available: boolean;
    credentials?: {
        email: string;
        password: string;
    };
    message?: string;
}
