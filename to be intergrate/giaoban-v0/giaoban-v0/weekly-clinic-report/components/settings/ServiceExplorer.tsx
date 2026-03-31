'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronRight, Loader2, Database, FolderTree, FileSearch } from 'lucide-react';

interface ServiceGroup {
    dm_servicegroupid: number;
    dm_servicegroupname: string;
}

interface ServiceSubGroup {
    dm_servicesubgroupid: number;
    dm_servicesubgroupname: string;
}

interface ServiceData {
    servicename: string;
}

export function ServiceExplorer() {
    const [groups, setGroups] = useState<ServiceGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ServiceGroup | null>(null);
    const [subgroups, setSubgroups] = useState<ServiceSubGroup[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ServiceData[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetch('/api/services/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setGroups(data);
                } else {
                    console.error('API Error:', data);
                    setGroups([]);
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setGroups([]);
            });
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetch(`/api/services/categories?type=subgroup&group_id=${selectedGroup.dm_servicegroupid}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSubgroups(data);
                    } else {
                        console.error('API Error (Subgroups):', data);
                        setSubgroups([]);
                    }
                })
                .catch(err => {
                    console.error('Fetch error (Subgroups):', err);
                    setSubgroups([]);
                });
        } else {
            setSubgroups([]);
        }
    }, [selectedGroup]);

    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 2) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/services?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSearchResults(data);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Khám phá Danh mục Dịch vụ HIS</CardTitle>
                        <CardDescription>Tra cứu nhóm, phân nhóm và tên dịch vụ từ hệ thống HIS (pkgd)</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="groups" className="w-full">
                    <div className="border-b px-4">
                        <TabsList className="h-12 bg-transparent gap-4">
                            <TabsTrigger value="groups" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                                <FolderTree className="h-4 w-4" />
                                Danh mục Nhóm
                            </TabsTrigger>
                            <TabsTrigger value="search" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 gap-2">
                                <FileSearch className="h-4 w-4" />
                                Tìm kiếm Dịch vụ
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="groups" className="m-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y md:divide-y-0">
                            {/* Left Column: Service Groups */}
                            <div className="flex flex-col min-h-[400px] max-h-[500px]">
                                <div className="px-4 py-3 bg-slate-50 border-b font-medium text-sm text-slate-600 flex items-center gap-2">
                                    <FolderTree className="h-4 w-4" />
                                    Nhóm Dịch vụ ({groups.length})
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="divide-y">
                                        {groups.map(group => (
                                            <button
                                                key={group.dm_servicegroupid}
                                                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${selectedGroup?.dm_servicegroupid === group.dm_servicegroupid
                                                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                        : 'border-l-4 border-l-transparent'
                                                    }`}
                                                onClick={() => setSelectedGroup(group)}
                                            >
                                                <span className="flex-1 text-sm truncate">{group.dm_servicegroupname}</span>
                                                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Right Column: Subgroups */}
                            <div className="flex flex-col min-h-[400px] max-h-[500px]">
                                <div className="px-4 py-3 bg-slate-50 border-b font-medium text-sm text-slate-600">
                                    {selectedGroup ? (
                                        <span className="truncate block">Phân nhóm: <span className="text-blue-600">{selectedGroup.dm_servicegroupname}</span></span>
                                    ) : (
                                        'Chọn nhóm để xem phân nhóm'
                                    )}
                                </div>
                                <ScrollArea className="flex-1">
                                    {!selectedGroup && (
                                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                                            <FolderTree className="h-12 w-12 mb-3 opacity-50" />
                                            <p className="text-sm">Chọn một nhóm dịch vụ</p>
                                        </div>
                                    )}
                                    {selectedGroup && subgroups.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                                            <p className="text-sm">Không có phân nhóm</p>
                                        </div>
                                    )}
                                    <div className="divide-y">
                                        {subgroups.map(sub => (
                                            <div key={sub.dm_servicesubgroupid} className="px-4 py-3 text-sm hover:bg-slate-50 truncate">
                                                {sub.dm_servicesubgroupname}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="search" className="m-0 p-4 space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Nhập tên dịch vụ cần tìm (VD: 'Nhi', 'X-quang')..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                Tìm kiếm
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Tên dịch vụ</TableHead>
                                        <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {searchResults.length === 0 && !isSearching && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-32 text-muted-foreground">
                                                <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                Nhập từ khóa và bấm tìm kiếm
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {searchResults.map((service, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium truncate max-w-md">{service.servicename}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-50"
                                                    onClick={() => navigator.clipboard.writeText(service.servicename)}
                                                >
                                                    Copy
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
