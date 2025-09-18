declare module 'fluentReports/lib/esm/fluentReports.mjs' {
  export class Report {
    constructor(filename: string);
    pageHeader(content: string[]): Report;
    data(data: any[]): Report;
    detail(columns: [string, number][]): Report;
    groupBy(field: string): Report;
    summary(content: string[]): Report;
    render(): Promise<Buffer>;
  }
}

