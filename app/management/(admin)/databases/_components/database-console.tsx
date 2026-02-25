"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { executeTenantQuery } from "../actions";
import { Play, TerminalSquare, AlertCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function DatabaseConsole({ tenants }: { tenants: any[] }) {
    const [selectedTenant, setSelectedTenant] = useState<string>("");
    const [query, setQuery] = useState<string>("SELECT * FROM \"User\" LIMIT 10;");
    const [loading, setLoading] = useState(false);

    // Result States
    const [resultData, setResultData] = useState<any[] | null>(null);
    const [resultFields, setResultFields] = useState<string[]>([]);
    const [rowCount, setRowCount] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleExecute = async () => {
        if (!selectedTenant) {
            setErrorMsg("Harap pilih tenant target terlebih dahulu.");
            return;
        }

        if (!query.trim()) {
            setErrorMsg("Kueri SQL tidak boleh kosong.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setResultData(null);
        setResultFields([]);
        setRowCount(null);

        const res = await executeTenantQuery(selectedTenant, query);

        if (res.success) {
            setResultData(res.data || []);
            setResultFields(res.fields || []);
            setRowCount(res.rowCount || 0);
        } else {
            setErrorMsg(res.error || "Terjadi kesalahan saat mengeksekusi kueri.");
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top Toolbar */}
            <div className="p-4 border-b flex flex-wrap items-end gap-4 bg-muted/30">
                <div className="space-y-1.5 w-full max-w-xs">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Database</Label>
                    <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Pilih tenant..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tenants.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name} ({t.slug})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="ml-auto">
                    <Button
                        onClick={handleExecute}
                        disabled={loading || !selectedTenant}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {loading ? "Mengeksekusi..." : "Eksekusi Kueri"}
                    </Button>
                </div>
            </div>

            {/* Split View Container */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Editor Top Section */}
                <div className="h-1/3 min-h-[150px] border-b relative">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-[#1e1e1e] text-[#d4d4d4]"
                        placeholder='SELECT * FROM "User" LIMIT 10;'
                        spellCheck={false}
                    />
                </div>

                {/* Results Bottom Section */}
                <div className="h-2/3 overflow-auto relative bg-background flex flex-col">
                    <div className="sticky top-0 bg-muted px-4 py-2 border-b flex justify-between items-center z-10">
                        <span className="text-xs font-semibold flex items-center gap-2">
                            <TerminalSquare className="h-3 w-3" />
                            Hasil Eksekusi
                        </span>
                        {rowCount !== null && !errorMsg && (
                            <span className="text-xs text-muted-foreground">
                                {rowCount} baris dikembalikan
                            </span>
                        )}
                    </div>

                    <div className="flex-1 p-0 overflow-auto">
                        {loading ? (
                            <div className="flex justify-center items-center h-full text-muted-foreground animate-pulse text-sm">
                                Menjalankan kueri SQL...
                            </div>
                        ) : errorMsg ? (
                            <div className="p-6">
                                <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex gap-3 text-sm">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <div className="font-mono">{errorMsg}</div>
                                </div>
                            </div>
                        ) : resultData ? (
                            resultData.length === 0 ? (
                                <div className="flex justify-center flex-col items-center h-full text-muted-foreground text-sm p-8 text-center gap-2">
                                    <span>Kueri berhasil dieksekusi tetapi tidak mengembalikan data apa pun.</span>
                                </div>
                            ) : (
                                <Table className="min-w-max border-t-0">
                                    <TableHeader className="bg-muted">
                                        <TableRow className="hover:bg-muted">
                                            {resultFields.map((field, i) => (
                                                <TableHead key={i} className="font-mono text-xs whitespace-nowrap h-8 py-1">
                                                    {field}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resultData.map((row, rIndex) => (
                                            <TableRow key={rIndex} className="hover:bg-muted/50">
                                                {resultFields.map((field, cIndex) => {
                                                    let val = row[field];
                                                    // Handle object rendering
                                                    if (val !== null && typeof val === 'object') {
                                                        if (val instanceof Date) {
                                                            val = val.toISOString();
                                                        } else {
                                                            val = JSON.stringify(val);
                                                        }
                                                    }
                                                    return (
                                                        <TableCell key={cIndex} className="font-mono text-xs whitespace-nowrap py-2 max-w-[300px] truncate" title={String(val)}>
                                                            {val === null ? (
                                                                <span className="text-muted-foreground/50 italic">null</span>
                                                            ) : String(val)}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )
                        ) : (
                            <div className="flex justify-center items-center h-full text-muted-foreground/50 text-sm">
                                Tulis dan jalankan kueri untuk melihat hasil di sini.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
