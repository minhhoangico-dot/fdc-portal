
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2, Plus, Loader2 } from 'lucide-react';

interface IcdCode {
    id: string;
    icd_code: string;
    disease_name_vi: string;
    disease_group: string;
    is_active: boolean;
    color_code: string | null;
}

export function IcdCodeManager() {
    const [codes, setCodes] = useState<IcdCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        icd_code: '',
        disease_name_vi: '',
        disease_group: '',
        color_code: '#3b82f6'
    });

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/icd-codes');
            const data = await res.json();
            setCodes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCodes();
    }, []);

    const handleSubmit = async () => {
        try {
            const url = '/api/settings/icd-codes';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { ...formData, id: editingId } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                fetchCodes();
                // Reset form
                setFormData({ icd_code: '', disease_name_vi: '', disease_group: '', color_code: '#3b82f6' });
                setEditingId(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
        try {
            await fetch(`/api/settings/icd-codes?id=${id}`, { method: 'DELETE' });
            fetchCodes();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (code: IcdCode) => {
        setEditingId(code.id);
        setFormData({
            icd_code: code.icd_code,
            disease_name_vi: code.disease_name_vi,
            disease_group: code.disease_group,
            color_code: code.color_code || '#3b82f6'
        });
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingId(null);
        setFormData({ icd_code: '', disease_name_vi: '', disease_group: '', color_code: '#3b82f6' });
        setIsDialogOpen(true);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Danh sách Bệnh truyền nhiễm theo dõi</CardTitle>
                    <CardDescription>Cấu hình mã ICD-10 để thống kê báo cáo</CardDescription>
                </div>
                <Button onClick={openNew}>
                    <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã ICD</TableHead>
                                <TableHead>Tên bệnh</TableHead>
                                <TableHead>Nhóm</TableHead>
                                <TableHead>Màu</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {codes.map((code) => (
                                <TableRow key={code.id}>
                                    <TableCell className="font-bold">{code.icd_code}</TableCell>
                                    <TableCell>{code.disease_name_vi}</TableCell>
                                    <TableCell>{code.disease_group}</TableCell>
                                    <TableCell>
                                        <div className="w-6 h-6 rounded border" style={{ backgroundColor: code.color_code || '#ccc' }}></div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={code.is_active ? 'default' : 'secondary'}>
                                            {code.is_active ? 'Đang theo dõi' : 'Tắt'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(code)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(code.id)} className="text-red-500 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Cập nhật' : 'Thêm mới'} mã bệnh</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Mã ICD</Label>
                                <Input
                                    value={formData.icd_code}
                                    onChange={(e) => setFormData({ ...formData, icd_code: e.target.value })}
                                    className="col-span-3"
                                    placeholder="VD: J09"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tên bệnh</Label>
                                <Input
                                    value={formData.disease_name_vi}
                                    onChange={(e) => setFormData({ ...formData, disease_name_vi: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Nhóm</Label>
                                <Input
                                    value={formData.disease_group}
                                    onChange={(e) => setFormData({ ...formData, disease_group: e.target.value })}
                                    className="col-span-3"
                                    placeholder="VD: cum, rsv..."
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Màu sắc</Label>
                                <div className="col-span-3 flex gap-2">
                                    <Input
                                        type="color"
                                        value={formData.color_code}
                                        onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={formData.color_code}
                                        onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit}>{editingId ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
