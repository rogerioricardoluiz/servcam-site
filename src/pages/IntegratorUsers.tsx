
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '@/auth/context';
import { User, UserRole, UserPlan, Neighborhood } from '../types';
import { MockService } from '../services/mockService';
import { supabase } from '../lib/supabaseClient';
import { Card, Button, Input, Modal, Badge } from '../components/UI';
import { 
    Trash2, MapPin, Users, Search, 
    Edit2, Loader2, Wrench, CheckCircle, Smartphone, Mail, RefreshCw, Filter, Database, AlertTriangle,
    Star, Upload, Check, Settings, Building, CreditCard, Sparkles, AlertCircle, Sliders, FileText, UserPlus, X,
    Shield, Lock, Eye, EyeOff, UserCheck, ArrowLeft, Copy, ExternalLink, Code, Globe, MessageSquare, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const IntegratorUsers: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [residents, setResidents] = useState<User[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [integrators, setIntegrators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminFilterHood, setAdminFilterHood] = useState('');
  const [adminFilterIntegrator, setAdminFilterIntegrator] = useState('');
  const [integratorFilterSearch, setIntegratorFilterSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'team' | 'trial' | 'subscribed' | 'integrator'>('all');
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<{ userName: string, amount: number, name: string, base64: string } | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isCreateIntegratorModalOpen, setIsCreateIntegratorModalOpen] = useState(false);
  const [integratorName, setIntegratorName] = useState('');
  const [integratorEmail, setIntegratorEmail] = useState('');
  const [integratorPhone, setIntegratorPhone] = useState('');
  const [integratorPassword, setIntegratorPassword] = useState('123456');
  const [integratorCnpj, setIntegratorCnpj] = useState('');
  const [integratorRazaoSocial, setIntegratorRazaoSocial] = useState('');

  // Editing integrator modal states
  const [editingIntegrator, setEditingIntegrator] = useState<User | null>(null);
  const [editIntName, setEditIntName] = useState('');
  const [editIntEmail, setEditIntEmail] = useState('');
  const [editIntPhone, setEditIntPhone] = useState('');
  const [editIntCnpj, setEditIntCnpj] = useState('');
  const [editIntRazaoSocial, setEditIntRazaoSocial] = useState('');
  const [editIntLogo, setEditIntLogo] = useState('');
  const [editIntPassword, setEditIntPassword] = useState('');
  const [savingIntegratorEdit, setSavingIntegratorEdit] = useState(false);

  // Code generator modal states
  const [selectedIntegratorForCode, setSelectedIntegratorForCode] = useState<User | null>(null);
  const [copiedIntegratorId, setCopiedIntegratorId] = useState<string | null>(null);
  const [copiedIntegratorLink, setCopiedIntegratorLink] = useState<string | null>(null);
  const [copiedModalIndexHtml, setCopiedModalIndexHtml] = useState(false);
  const [copiedModalIframe, setCopiedModalIframe] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'index' | 'iframe'>('index');

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedbackBanner({ msg, type });
    setTimeout(() => setFeedbackBanner(null), 4500);
  };

  const handleFetchAndActionReceipt = async (payment: any, resident: any, action: 'view' | 'download') => {
    setLoadingReceiptId(payment.id);
    try {
      let base64 = payment.receipt_base64;
      let name = payment.receipt_name || "comprovante.png";

      if (!base64 && payment.id) {
        const { data: dataRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', `receipt_data_${payment.id}`)
          .maybeSingle();

        if (dataRow && dataRow.value) {
          base64 = dataRow.value;
        }
      }

      if (!base64 && payment.user_id) {
        const { data: userReceiptIdRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', `user_receipt_id_${payment.user_id}`)
          .maybeSingle();

        if (userReceiptIdRow && userReceiptIdRow.value) {
          const pId = userReceiptIdRow.value;
          const { data: dataRow } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `receipt_data_${pId}`)
            .maybeSingle();
          if (dataRow && dataRow.value) {
            base64 = dataRow.value;
          }
        }
      }

      if (!base64 && payment.id) {
        base64 = localStorage.getItem(`receipt_data_${payment.id}`) || null;
      }

      if (!base64) {
        throw new Error("Comprovante não encontrado. O morador precisa anexá-lo novamente.");
      }

      if (action === 'view') {
        setSelectedReceipt({
          userName: resident.name,
          amount: payment.amount || 5.00,
          name: name,
          base64: base64
        });
      } else {
        const a = document.createElement('a');
        a.href = base64;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao ler comprovante: " + (err.message || err));
    } finally {
      setLoadingReceiptId(null);
    }
  };
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editHoodId, setEditHoodId] = useState('');
  const [editSecondaryHoodId, setEditSecondaryHoodId] = useState('');
  const [editIntegratorId, setEditIntegratorId] = useState('');
  const [editPlan, setEditPlan] = useState<string>('PREMIUM');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.RESIDENT);
  const [editApproved, setEditApproved] = useState<boolean>(true);
  const [modalIntegratorSearch, setModalIntegratorSearch] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Individual client plan configuration (Edit Modal)
  const [editSinglePlanPrice, setEditSinglePlanPrice] = useState('49,90');
  const [editHasCameraRental, setEditHasCameraRental] = useState(false);
  const [editCameraRentalDetails, setEditCameraRentalDetails] = useState('');
  const [editRecordingDays, setEditRecordingDays] = useState<number>(7);

  // Create Client Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newHoodId, setNewHoodId] = useState('');
  const [newSecondaryHoodId, setNewSecondaryHoodId] = useState('');
  const [newIntegratorId, setNewIntegratorId] = useState('');
  const [newPlan, setNewPlan] = useState<UserPlan>('PREMIUM');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.RESIDENT);
  const [newApproved, setNewApproved] = useState<boolean>(true);
  const [createIntegratorSearch, setCreateIntegratorSearch] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Individual client plan configuration (Create Modal)
  const [newSinglePlanPrice, setNewSinglePlanPrice] = useState('49,90');
  const [newHasCameraRental, setNewHasCameraRental] = useState(false);
  const [newCameraRentalDetails, setNewCameraRentalDetails] = useState('');
  const [newRecordingDays, setNewRecordingDays] = useState<number>(7);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [integratorToDelete, setIntegratorToDelete] = useState<User | null>(null);

  // Create & Manage Team Modal states
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [teamModalTab, setTeamModalTab] = useState<'list' | 'create' | 'edit'>('list');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [showTeamPassword, setShowTeamPassword] = useState(false);

  // New Team Member fields
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('123456');
  const [newTeamPhone, setNewTeamPhone] = useState('');
  const [newTeamHoodId, setNewTeamHoodId] = useState('');
  const [newTeamCanRead, setNewTeamCanRead] = useState(true);
  const [newTeamCanEdit, setNewTeamCanEdit] = useState(false);
  const [newTeamRole, setNewTeamRole] = useState<UserRole>(UserRole.SCR);
  const [newTeamRoleTitle, setNewTeamRoleTitle] = useState('Motovigia / Ronda (SCR)');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Edit Team Member fields
  const [editingTeamMember, setEditingTeamMember] = useState<User | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamEmail, setEditTeamEmail] = useState('');
  const [editTeamPassword, setEditTeamPassword] = useState('');
  const [editTeamPhone, setEditTeamPhone] = useState('');
  const [editTeamRole, setEditTeamRole] = useState<UserRole>(UserRole.SCR);
  const [editTeamRoleTitle, setEditTeamRoleTitle] = useState('');
  const [editTeamHoodId, setEditTeamHoodId] = useState('');
  const [editTeamCanRead, setEditTeamCanRead] = useState(true);
  const [editTeamCanEdit, setEditTeamCanEdit] = useState(false);
  const [savingTeamMember, setSavingTeamMember] = useState(false);

  // Edit permissions states for general edit modal
  const [editCanRead, setEditCanRead] = useState(true);
  const [editCanEdit, setEditCanEdit] = useState(false);

  const openCreateTeamModal = () => {
      setNewTeamName('');
      setNewTeamEmail('');
      setNewTeamPassword('123456');
      setNewTeamPhone('');
      setNewTeamRole(UserRole.SCR);
      setNewTeamRoleTitle('Motovigia / Ronda (SCR)');
      setNewTeamCanRead(true);
      setNewTeamCanEdit(false);
      setEditingTeamMember(null);
      setTeamSearchTerm('');
      if (user?.role === UserRole.INTEGRATOR) {
          setNewTeamHoodId(user.neighborhoodId || neighborhoods[0]?.id || '');
      } else {
          setNewTeamHoodId(adminFilterHood || neighborhoods[0]?.id || '');
      }
      const existingTeamCount = residents.filter(r => r.role !== UserRole.RESIDENT || !!r.isTeam).length;
      setTeamModalTab(existingTeamCount > 0 ? 'list' : 'create');
      setIsCreateTeamModalOpen(true);
  };

  const startEditingTeamMember = (member: User) => {
      setEditingTeamMember(member);
      setEditTeamName(member.name);
      setEditTeamEmail(member.email || '');
      setEditTeamPassword('');
      setEditTeamPhone(member.phone || '');
      setEditTeamRole(member.role);
      setEditTeamRoleTitle(member.teamRoleTitle || (member.role === UserRole.SCR ? 'Motovigia / Ronda (SCR)' : 'Operador de Monitoramento'));
      setEditTeamHoodId(member.neighborhoodId || '');
      setEditTeamCanRead(member.canRead !== false);
      setEditTeamCanEdit(member.canEdit === true);
      setTeamModalTab('edit');
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTeamName.trim() || !newTeamEmail.trim()) {
          showFeedback('Preencha o nome e o e-mail do membro da equipe.', 'error');
          return;
      }
      setCreatingTeam(true);
      try {
          const targetIntegratorId = user?.role === UserRole.INTEGRATOR ? user.id : (adminFilterIntegrator || undefined);
          let targetIntegratorName: string | undefined = undefined;
          if (user?.role === UserRole.INTEGRATOR) {
              targetIntegratorName = user.companyName || user.razaoSocial || user.name;
          } else if (targetIntegratorId) {
              const foundInt = integrators.find(i => i.id === targetIntegratorId);
              targetIntegratorName = foundInt ? (foundInt.companyName || foundInt.razaoSocial || foundInt.name) : undefined;
          }

          await MockService.createClientUser({
              name: newTeamName.trim(),
              email: newTeamEmail.trim(),
              password: newTeamPassword,
              phone: newTeamPhone.trim(),
              role: newTeamRole,
              plan: 'PREMIUM',
              neighborhoodId: newTeamHoodId || undefined,
              integratorId: targetIntegratorId,
              integratorName: targetIntegratorName,
              approved: true,
              canRead: newTeamCanRead,
              canEdit: newTeamCanEdit,
              isTeam: true,
              teamRoleTitle: newTeamRoleTitle
          });

          await fetchData();
          showFeedback(`Membro da equipe "${newTeamName}" incluído com sucesso!`, 'success');
          setNewTeamName('');
          setNewTeamEmail('');
          setNewTeamPhone('');
          setTeamModalTab('list');
      } catch (err: any) {
          showFeedback(err.message || 'Erro ao incluir membro da equipe.', 'error');
      } finally {
          setCreatingTeam(false);
      }
  };

  const handleSaveEditTeamMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTeamMember) return;
      if (!editTeamName.trim()) {
          showFeedback('O nome do membro da equipe é obrigatório.', 'error');
          return;
      }
      setSavingTeamMember(true);
      try {
          const updatePayload: any = {
              name: editTeamName.trim(),
              email: editTeamEmail.trim() || undefined,
              phone: editTeamPhone.trim() || undefined,
              role: editTeamRole,
              neighborhood_id: editTeamHoodId || null,
              can_read: editTeamCanRead,
              can_edit: editTeamCanEdit,
              isTeam: true,
              teamRoleTitle: editTeamRoleTitle
          };
          if (editTeamPassword.trim().length >= 6) {
              updatePayload.password = editTeamPassword.trim();
          }
          await MockService.adminUpdateUser(editingTeamMember.id, updatePayload);
          await fetchData();
          showFeedback(`Membro "${editTeamName}" atualizado com sucesso!`, 'success');
          setEditingTeamMember(null);
          setTeamModalTab('list');
      } catch (err: any) {
          showFeedback(err.message || 'Erro ao atualizar membro da equipe.', 'error');
      } finally {
          setSavingTeamMember(false);
      }
  };

  const toggleTeamMemberRead = async (member: User) => {
      const newReadState = member.canRead === false;
      await MockService.adminUpdateUser(member.id, { can_read: newReadState });
      await fetchData();
      showFeedback(`Privilégio de leitura de ${member.name} ${newReadState ? 'ativado' : 'desativado'}.`);
  };

  const toggleTeamMemberEdit = async (member: User) => {
      const newEditState = !member.canEdit;
      await MockService.adminUpdateUser(member.id, { can_edit: newEditState });
      await fetchData();
      showFeedback(`Privilégio de edição de ${member.name} ${newEditState ? 'ativado' : 'desativado'}.`);
  };

  const getDaysRemaining = (promoEnd?: string) => {
      if (!promoEnd) return 0;
      const promoEndMs = new Date(promoEnd).getTime();
      const nowMs = new Date().getTime();
      const diffMs = promoEndMs - nowMs;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [hoods, ints, allUsers] = await Promise.all([
            MockService.getNeighborhoods(true),
            MockService.getIntegrators(),
            MockService.getUsers()
        ]);
        setIntegrators(ints);

        const filteredHoods = user?.role === UserRole.ADMIN 
          ? hoods 
          : (user?.role === UserRole.INTEGRATOR
              ? hoods.filter(h => h.integratorId === user.id)
              : hoods.filter(h => 
                  h.id === user?.neighborhoodId || 
                  h.id === user?.secondaryNeighborhoodId
                ));
        setNeighborhoods(filteredHoods);
        
        // Se Admin, traz tudo. Se Integrador, traz estritamente os clientes vinculados à sua empresa integradora ou aos sistemas dela.
        if (user?.role === UserRole.INTEGRATOR) {
          const myHoodIds = new Set(filteredHoods.map(h => h.id));
          setResidents(
            allUsers.filter(u => {
              // 1. Cliente explicitamente vinculado a este integrador
              if (u.integratorId === user.id) return true;
              // 2. Se o cliente possui vínculo explícito com OUTRO integrador, JAMAIS incluir
              if (u.integratorId && u.integratorId !== user.id) return false;
              // 3. Se o cliente pertence a um sistema de propriedade deste integrador
              if (u.neighborhoodId && myHoodIds.has(u.neighborhoodId)) return true;
              if (u.secondaryNeighborhoodId && myHoodIds.has(u.secondaryNeighborhoodId)) return true;
              return false;
            })
          );
        } else {
          setResidents(allUsers);
        }

        // Fetch payments for checking promotion receipts
        const allPayments = await MockService.getPayments();
        const enrichedPayments = allPayments.map(p => {
          const match = p.reference_month?.match(/\(Anexo:\s*(.*?)\)/);
          const hasAttachment = !!(p.receipt_base64 || p.receipt_name || localStorage.getItem(`receipt_data_${p.id}`) || match);
          const receiptName = p.receipt_name || localStorage.getItem(`receipt_name_${p.id}`) || (match ? match[1] : null) || "comprovante.png";
          return {
            ...p,
            receipt_name: receiptName,
            has_attachment: hasAttachment
          };
        });
        setPayments(enrichedPayments);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => { 
    if (user) fetchData(); 

    const subProfiles = MockService.subscribeToTable('profiles', fetchData);
    const subHoods = MockService.subscribeToTable('neighborhoods', fetchData);
    const subPayments = MockService.subscribeToTable('payments', fetchData);

    return () => {
        supabase.removeChannel(subProfiles);
        supabase.removeChannel(subHoods);
        supabase.removeChannel(subPayments);
    };
  }, [fetchData, user]);

  const openCreateClientModal = () => {
      setNewName('');
      setNewEmail('');
      setNewPassword('123456');
      setNewPhone('');
      setNewAddress('');
      setNewPlan('PREMIUM');
      setNewRole(UserRole.RESIDENT);
      setNewApproved(true);
      setCreateIntegratorSearch('');
      if (user?.role === UserRole.INTEGRATOR) {
          setNewIntegratorId(user.id);
          setNewHoodId(neighborhoods[0]?.id || '');
      } else {
          setNewIntegratorId(adminFilterIntegrator || '');
          setNewHoodId(adminFilterHood || neighborhoods[0]?.id || '');
      }
      setNewSecondaryHoodId('');

      // Initialize with integrator's default plan settings
      let defaultPrice = user?.singlePlanPrice ? String(user.singlePlanPrice) : '49,90';
      let defaultRental = user?.hasCameraRental !== undefined ? Boolean(user.hasCameraRental) : false;
      let defaultDetails = user?.cameraRentalDetails || '';
      let defaultDays = user?.recordingDays !== undefined ? Number(user.recordingDays) : 7;

      if (user?.id) {
          try {
              const rawPlan = localStorage.getItem(`atalaia_integrator_plan_${user.id}`);
              if (rawPlan) {
                  const p = JSON.parse(rawPlan);
                  if (p.singlePlanPrice !== undefined) defaultPrice = String(p.singlePlanPrice);
                  if (p.hasCameraRental !== undefined) defaultRental = Boolean(p.hasCameraRental);
                  if (p.cameraRentalDetails !== undefined) defaultDetails = p.cameraRentalDetails;
                  if (p.recordingDays !== undefined) defaultDays = Number(p.recordingDays);
              }
          } catch (_) {}
      }

      setNewSinglePlanPrice(defaultPrice);
      setNewHasCameraRental(defaultRental);
      setNewCameraRentalDetails(defaultDetails);
      setNewRecordingDays(defaultDays);

      setIsCreateModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim() || !newEmail.trim()) {
          showFeedback('Preencha o nome e o e-mail do cliente.', 'error');
          return;
      }
      setCreatingUser(true);
      try {
          const targetIntegratorId = user?.role === UserRole.INTEGRATOR ? user.id : (newIntegratorId || undefined);
          let targetIntegratorName: string | undefined = undefined;
          if (user?.role === UserRole.INTEGRATOR) {
              targetIntegratorName = user.companyName || user.razaoSocial || user.name;
          } else if (targetIntegratorId) {
              const foundInt = integrators.find(i => i.id === targetIntegratorId);
              targetIntegratorName = foundInt ? (foundInt.companyName || foundInt.razaoSocial || foundInt.name) : undefined;
          }

          await MockService.createClientUser({
              name: newName,
              email: newEmail,
              password: newPassword,
              phone: newPhone,
              address: newAddress,
              plan: newPlan,
              role: newRole,
              neighborhoodId: newHoodId || undefined,
              secondaryNeighborhoodId: newSecondaryHoodId || undefined,
              integratorId: targetIntegratorId,
              integratorName: targetIntegratorName,
              approved: newApproved,
              singlePlanPrice: newSinglePlanPrice.trim() || '49,90',
              hasCameraRental: Boolean(newHasCameraRental),
              cameraRentalDetails: newCameraRentalDetails.trim(),
              recordingDays: Number(newRecordingDays)
          });

          setIsCreateModalOpen(false);
          await fetchData();
          showFeedback(`Cliente "${newName}" incluído com o plano configurado com sucesso!`, 'success');
      } catch (err: any) {
          showFeedback(err.message || 'Erro ao incluir cliente.', 'error');
      } finally {
          setCreatingUser(false);
      }
  };
    const handleCreateIntegrator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!integratorName.trim() || !integratorEmail.trim()) {
            showFeedback('Preencha o nome e o e-mail da empresa.', 'error');
            return;
        }
        setCreatingUser(true);
        try {
            const cleanPhone = integratorPhone.trim();
            const created = await MockService.createClientUser({
                name: integratorName.trim(),
                email: integratorEmail.trim(),
                password: integratorPassword,
                phone: cleanPhone || undefined,
                role: UserRole.INTEGRATOR,
                approved: true,
                address: JSON.stringify({
                    companyName: integratorName.trim(),
                    cnpj: integratorCnpj.trim(),
                    razaoSocial: integratorRazaoSocial.trim(),
                    phone: cleanPhone
                })
            });

            if (created?.id && cleanPhone) {
                await MockService.saveIntegratorPhone(created.id, cleanPhone);
            }

            setIsCreateIntegratorModalOpen(false);
            setIntegratorName('');
            setIntegratorEmail('');
            setIntegratorPhone('');
            setIntegratorCnpj('');
            setIntegratorRazaoSocial('');
            await fetchData();
            setSelectedIntegratorForCode(created);
            showFeedback(`Empresa "${created.name}" incluída com sucesso! ID, link e WhatsApp configurados.`, 'success');
        } catch (err: any) {
            showFeedback(err.message || 'Erro ao incluir empresa.', 'error');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleOpenEditIntegrator = (intUser: User) => {
        setEditingIntegrator(intUser);
        setEditIntName(intUser.companyName || intUser.razaoSocial || intUser.name || '');
        setEditIntEmail(intUser.email || '');
        setEditIntPhone(intUser.phone || '');
        setEditIntCnpj(intUser.cnpj || '');
        setEditIntRazaoSocial(intUser.razaoSocial || '');
        setEditIntLogo(intUser.companyLogo || '');
        setEditIntPassword('');
    };

    const handleSaveIntegratorEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingIntegrator) return;
        if (!editIntName.trim()) {
            showFeedback('O nome da empresa é obrigatório.', 'error');
            return;
        }
        setSavingIntegratorEdit(true);
        try {
            const intId = editingIntegrator.id;
            const cleanPhone = editIntPhone.trim();
            const payload: any = {
                name: editIntName.trim(),
                phone: cleanPhone,
                address: JSON.stringify({
                    companyName: editIntName.trim(),
                    razaoSocial: editIntRazaoSocial.trim(),
                    cnpj: editIntCnpj.trim(),
                    phone: cleanPhone,
                    companyLogo: editIntLogo.trim()
                })
            };
            if (editIntEmail.trim()) payload.email = editIntEmail.trim();
            if (editIntPassword.trim().length >= 6) payload.password = editIntPassword.trim();

            await MockService.adminUpdateUser(intId, payload);
            await MockService.saveIntegratorPhone(intId, cleanPhone);

            setIntegrators(prev => prev.map(item => {
                if (item.id === intId) {
                    return {
                        ...item,
                        name: editIntName.trim(),
                        companyName: editIntName.trim(),
                        razaoSocial: editIntRazaoSocial.trim(),
                        cnpj: editIntCnpj.trim(),
                        phone: cleanPhone,
                        companyLogo: editIntLogo.trim() || item.companyLogo,
                        email: editIntEmail.trim() || item.email
                    };
                }
                return item;
            }));

            window.dispatchEvent(new CustomEvent('atalaia:integrator_updated', { detail: { id: intId, phone: cleanPhone } }));
            showFeedback(`Empresa integradora "${editIntName}" atualizada com sucesso!`, 'success');
            setEditingIntegrator(null);
        } catch (err: any) {
            showFeedback(err.message || 'Erro ao salvar alterações da integradora.', 'error');
        } finally {
            setSavingIntegratorEdit(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setSavingUser(true);
      try {
          const targetIntegratorId = user?.role === UserRole.INTEGRATOR ? user.id : (editIntegratorId || null);
          let targetIntegratorName: string | undefined = undefined;
          if (user?.role === UserRole.INTEGRATOR) {
              targetIntegratorName = user.companyName || user.razaoSocial || user.name;
          } else if (targetIntegratorId) {
              const foundInt = integrators.find(i => i.id === targetIntegratorId);
              targetIntegratorName = foundInt ? (foundInt.companyName || foundInt.razaoSocial || foundInt.name) : undefined;
          }

          await MockService.adminUpdateUser(editingUser.id, { 
              name: editName, 
              email: editEmail || editingUser.email,
              phone: editPhone, 
              address: editAddress,
              neighborhood_id: editHoodId || null,
              primary_neighborhood_id: editHoodId || null,
              secondary_neighborhood_id: editSecondaryHoodId || null,
              integrator_id: targetIntegratorId,
              integrator_name: targetIntegratorName || null,
              plan: editPlan,
              role: editRole,
              approved: editApproved,
              can_read: editCanRead,
              can_edit: editCanEdit,
              singlePlanPrice: editSinglePlanPrice,
              hasCameraRental: editHasCameraRental,
              cameraRentalDetails: editCameraRentalDetails,
              recordingDays: editRecordingDays
          });

          if (user?.role === UserRole.ADMIN && editRole === UserRole.INTEGRATOR && editHoodId) {
              await MockService.linkNeighborhoodIntegrator(editHoodId, editingUser.id, editName);
          }

          setIsEditModalOpen(false);
          await fetchData();
          showFeedback(`Dados de "${editName}" atualizados com sucesso!`, 'success');
      } catch (e: any) {
          showFeedback(e.message || 'Erro ao atualizar cliente.', 'error');
      } finally {
          setSavingUser(false);
      }
  };

  const totalResidents = residents.filter(r => r.role === UserRole.RESIDENT && !r.isTeam).length;
  const totalTeam = residents.filter(r => r.role !== UserRole.RESIDENT || !!r.isTeam).length;
  const trialResidents = residents.filter(r => r.role === UserRole.RESIDENT && r.promoActive && r.promoEnd).length;
  const subscribedResidents = residents.filter(r => r.role === UserRole.RESIDENT && !r.promoActive && (r.plan === 'FAMILY' || r.plan === 'PREMIUM')).length;


  const filteredIntegratorsForBar = integrators.filter(intUser => {
      if (!integratorFilterSearch.trim()) return true;
      const q = integratorFilterSearch.toLowerCase().trim();
      const compName = (intUser.companyName || intUser.razaoSocial || intUser.name || '').toLowerCase();
      const emailStr = (intUser.email || '').toLowerCase();
      return compName.includes(q) || emailStr.includes(q);
  });

  const filteredResidents = residents.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
          r.name.toLowerCase().includes(searchLower) || 
          (r.email && r.email.toLowerCase().includes(searchLower)) ||
          (r.phone && r.phone.includes(searchLower)) ||
          (r.address && r.address.toLowerCase().includes(searchLower)) ||
          (r.integratorName && r.integratorName.toLowerCase().includes(searchLower)) ||
          (r.teamRoleTitle && r.teamRoleTitle.toLowerCase().includes(searchLower)) ||
          (r.promoCoupon && r.promoCoupon.toLowerCase().includes(searchLower));

      const matchesHood = adminFilterHood
          ? (r.neighborhoodId === adminFilterHood || r.secondaryNeighborhoodId === adminFilterHood)
          : true;

      const matchesIntegrator = adminFilterIntegrator
          ? (r.integratorId === adminFilterIntegrator ||
             neighborhoods.find(n => n.id === r.neighborhoodId)?.integratorId === adminFilterIntegrator)
          : true;
      
      let matchesTab = true;
      if (filterTab === 'all') {
          matchesTab = r.role === UserRole.RESIDENT && !r.isTeam;
      } else if (filterTab === 'team') {
          matchesTab = r.role !== UserRole.RESIDENT || !!r.isTeam;
      } else if (filterTab === 'trial') {
          matchesTab = !!(r.role === UserRole.RESIDENT && r.promoActive && r.promoEnd);
      } else if (filterTab === 'subscribed') {
          matchesTab = !!(r.role === UserRole.RESIDENT && !r.promoActive && (r.plan === 'FAMILY' || r.plan === 'PREMIUM'));

      }

      return matchesSearch && matchesHood && matchesIntegrator && matchesTab;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20">
        {/* HEADER RESPONSIVO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 sm:gap-3">
                    <Database className="text-atalaia-neon shrink-0" size={28} /> 
                    <span>{user?.role === UserRole.ADMIN ? 'Gestão Geral do Sistema' : 'Gestão de Clientes da Base'}</span>
                </h1>
                {user?.role === UserRole.INTEGRATOR && (
                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                        <Building size={13} className="text-atalaia-neon shrink-0" />
                        Base vinculada: <strong className="text-atalaia-neon truncate">{user.companyName || user.razaoSocial || user.name}</strong>
                    </p>
                )}
            </div>
            
            {/* ACTION BUTTONS (2-COL ON MOBILE, ROW ON TABLET/DESKTOP) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                <Button
                    onClick={openCreateClientModal}
                    className="h-11 sm:h-12 px-3 sm:px-5 font-black uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(0,255,102,0.2)]"
                >
                    <UserPlus size={16} />
                    <span>Incluir Cliente</span>
                </Button>
                <Button
                    onClick={openCreateTeamModal}
                    className="h-11 sm:h-12 px-3 sm:px-5 font-black uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                    <Users size={16} />
                    <span>Incluir Equipe</span>
                </Button>
                {user?.role === UserRole.ADMIN && (
                    <Button
                        onClick={() => setIsCreateIntegratorModalOpen(true)}
                        className="col-span-2 sm:col-auto h-11 sm:h-12 px-3 sm:px-5 font-black uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(0,122,255,0.2)]"
                    >
                        <Building size={16} />
                        <span>Incluir Integradora</span>
                    </Button>
                )}
                <button 
                    onClick={fetchData} 
                    className="col-span-2 sm:col-auto h-11 sm:h-12 p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-atalaia-neon transition-colors flex items-center justify-center gap-2 cursor-pointer" 
                    title="Sincronizar Base"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Sincronizar Base</span>
                </button>
            </div>
        </div>

        {feedbackBanner && (
            <div className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold animate-in fade-in duration-200 ${
                feedbackBanner.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
                <div className="flex items-center gap-2.5">
                    {feedbackBanner.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                    <span>{feedbackBanner.msg}</span>
                </div>
                <button onClick={() => setFeedbackBanner(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer p-1">
                    <X size={16} />
                </button>
            </div>
        )}

        {/* METRICS GRID FOR INTEGRATOR/ADMIN (COMPACT 2-COL ON MOBILE) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 bg-zinc-900/40 border-white/5 flex items-center justify-between rounded-2xl">
                <div>
                    <span className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1">Total de Clientes</span>
                    <span className="text-2xl sm:text-3xl font-black text-white">{totalResidents}</span>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <Users size={20} />
                </div>
            </Card>

            {user?.role === UserRole.ADMIN && (
                <Card className="p-4 sm:p-5 bg-zinc-900/40 border-atalaia-neon/20 flex items-center justify-between rounded-2xl">
                    <div>
                        <span className="text-[10px] sm:text-xs text-atalaia-neon font-bold uppercase tracking-wider block mb-1">Integradoras</span>
                        <span className="text-2xl sm:text-3xl font-black text-atalaia-neon">{integrators.length}</span>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-atalaia-neon/10 border border-atalaia-neon/20 text-atalaia-neon flex items-center justify-center shrink-0">
                        <Building size={20} />
                    </div>
                </Card>
            )}
        </div>

        {user?.role === UserRole.ADMIN && (
            <Card className="p-4 sm:p-6 border-blue-500/20 bg-blue-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-2xl rounded-2xl">
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2"><Wrench size={18} className="text-blue-500"/> Integridade de Dados</h2>
                    <p className="text-xs text-gray-400">Corrige vínculos órfãos de usuários com bairros deletados.</p>
                </div>
                <Button onClick={async () => { const count = await MockService.maintenanceFixOrphans(); alert(`${count} usuários corrigidos.`); fetchData(); }} variant="outline" className="w-full sm:w-auto text-xs">Corrigir Agora</Button>
            </Card>
        )}

        {/* SEARCH AND FILTERS (CLEAN RESPONSIVE SPACING) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-4">
            <div className={`${user?.role === UserRole.ADMIN ? 'sm:col-span-2 md:col-span-5' : 'sm:col-span-2 md:col-span-8'} relative`}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome, email, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 sm:h-14 bg-[#111] border border-atalaia-border rounded-xl pl-10 sm:pl-12 pr-4 text-xs sm:text-sm text-white outline-none focus:border-atalaia-neon transition-all placeholder:text-zinc-500"
                />
            </div>

            {user?.role === UserRole.ADMIN && (
                <div className="md:col-span-4 flex gap-2">
                    <div className="relative flex-1">
                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-atalaia-neon" size={16} />
                        <select
                            className="w-full h-12 sm:h-14 bg-[#111] border border-atalaia-border rounded-xl pl-10 pr-3 text-white text-xs sm:text-sm outline-none focus:border-atalaia-neon"
                            value={adminFilterIntegrator}
                            onChange={(e) => setAdminFilterIntegrator(e.target.value)}
                        >
                            <option value="">Todas as Integradoras ({integrators.length})</option>
                            {filteredIntegratorsForBar.map(intUser => (
                                <option key={intUser.id} value={intUser.id}>
                                    {intUser.companyName || intUser.razaoSocial || intUser.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className={`${user?.role === UserRole.ADMIN ? 'md:col-span-3' : 'sm:col-span-2 md:col-span-4'}`}>
                <select
                    className="w-full h-12 sm:h-14 bg-[#111] border border-atalaia-border rounded-xl px-4 text-white text-xs sm:text-sm outline-none focus:border-atalaia-neon"
                    value={adminFilterHood}
                    onChange={(e) => setAdminFilterHood(e.target.value)}
                >
                    <option value="">Todos os Sistemas / Bairros</option>
                    {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
            </div>
        </div>

        {/* TABS FILTER (HORIZONTAL SCROLL ON MOBILE, CLEAN SINGLE STRIP) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-none no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
            <button
                onClick={() => setFilterTab('all')}
                className={`py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    filterTab === 'all'
                        ? 'bg-white text-black font-black shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
                Clientes ({totalResidents})
            </button>
            <button
                onClick={() => setFilterTab('team')}
                className={`py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    filterTab === 'team'
                        ? 'bg-blue-500 text-black font-black shadow-sm'
                        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                }`}
            >
                Equipe ({totalTeam})
            </button>

            {user?.role === UserRole.ADMIN && (
                <button
                    onClick={() => setFilterTab('integrator')}
                    className={`py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        filterTab === 'integrator'
                            ? 'bg-atalaia-neon text-black font-black shadow-sm'
                            : 'bg-atalaia-neon/10 text-atalaia-neon hover:bg-atalaia-neon/20'
                    }`}
                >
                    Integradoras ({integrators.length})
                </button>
            )}
        </div>

        {loading ? (
             <div className="text-center py-20 flex flex-col items-center">
                <Loader2 className="animate-spin text-atalaia-neon mb-4" size={48} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Consultando Supabase...</p>
            </div>
        ) : (user?.role === UserRole.ADMIN && filterTab === 'integrator') ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {integrators.map(intUser => {
                    const intId = intUser.id;
                    const isAlien = intUser.id === 'alienmonitoramento-integrator-id' || 
                                    intUser.id === 'a11e9920-6765-4f81-b454-e6778b77ee66' ||
                                    (intUser.companyName || '').toLowerCase().includes('alien') ||
                                    (intUser.name || '').toLowerCase().includes('alien') ||
                                    (intUser.email || '').toLowerCase().includes('alien');
                    const systemUuid = isAlien ? 'a11e9920-6765-4f81-b454-e6778b77ee66' : intId;
                    const slugId = isAlien ? 'alienmonitoramento-integrator-id' : (intUser.customSlug || null);
                    const baseOrigin = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
                        ? window.location.origin
                        : 'https://ais-dev-6poc3il3qcyznrtjn4rips-44114112762.us-west2.run.app';
                    const clientLink = isAlien 
                        ? `${baseOrigin}/#/logincliente?integrator=alienmonitoramento-integrator-id`
                        : `${baseOrigin}/#/logincliente?integrator=${intId}`;
                    const displayName = intUser.companyName || intUser.razaoSocial || intUser.name;
                    return (
                        <Card key={intUser.id} className="p-5 sm:p-6 bg-[#0a0a0a] border border-white/5 hover:border-atalaia-neon/30 transition-all rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="space-y-4">
                                <div className="flex gap-3 sm:gap-4 items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-atalaia-neon/10 border border-atalaia-neon/30 flex items-center justify-center text-atalaia-neon font-black shadow-inner shrink-0">
                                        <Building size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-white text-base truncate" title={displayName}>{displayName}</h3>
                                            <span className="text-[9px] bg-atalaia-neon/15 border border-atalaia-neon/30 text-atalaia-neon px-2 py-0.5 rounded font-black uppercase">
                                                Integradora
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{intUser.email}</p>
                                        {intUser.phone ? (
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-[11px] font-mono font-bold">
                                                    <MessageSquare size={11} fill="currentColor" /> {intUser.phone}
                                                </span>
                                                <a
                                                    href={`https://wa.me/55${intUser.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-zinc-400 hover:text-[#25D366] underline flex items-center gap-0.5"
                                                >
                                                    Testar WhatsApp
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                                                    ⚠️ Sem WhatsApp cadastrado
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditIntegrator(intUser)}
                                                    className="text-[10px] text-amber-300 hover:text-white underline font-bold cursor-pointer"
                                                >
                                                    + Cadastrar WhatsApp
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ID DO INTEGRADOR */}
                                <div className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-atalaia-neon font-black uppercase tracking-wider flex items-center gap-1">
                                            <Shield size={11} /> Código de ID (Sistema UUID)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(systemUuid);
                                                setCopiedIntegratorId(systemUuid);
                                                setTimeout(() => setCopiedIntegratorId(null), 2500);
                                            }}
                                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        >
                                            <Copy size={11} className={copiedIntegratorId === systemUuid ? "text-atalaia-neon" : ""} />
                                            {copiedIntegratorId === systemUuid ? 'Copiado!' : 'Copiar Código'}
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-zinc-200 select-all block break-all bg-zinc-950 p-1.5 rounded border border-white/5">
                                        {systemUuid}
                                    </code>

                                    {slugId && (
                                        <div className="pt-2 border-t border-white/5 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                                                    <Tag size={11} /> Identificador Amigável (Slug)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(slugId);
                                                        setCopiedIntegratorId(slugId);
                                                        setTimeout(() => setCopiedIntegratorId(null), 2500);
                                                    }}
                                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Copy size={11} className={copiedIntegratorId === slugId ? "text-atalaia-neon" : ""} />
                                                    {copiedIntegratorId === slugId ? 'Copiado!' : 'Copiar Slug'}
                                                </button>
                                            </div>
                                            <code className="text-xs font-mono text-amber-300/90 select-all block break-all bg-zinc-950 p-1.5 rounded border border-amber-500/20">
                                                {slugId}
                                            </code>
                                        </div>
                                    )}
                                </div>

                                {/* LINK DIRETO DOS CLIENTES */}
                                <div className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-atalaia-neon font-black uppercase tracking-wider flex items-center gap-1">
                                            <Globe size={11} /> Link do Cliente (/logincliente)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(clientLink);
                                                    setCopiedIntegratorLink(intId);
                                                    setTimeout(() => setCopiedIntegratorLink(null), 2500);
                                                }}
                                                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <Copy size={11} className={copiedIntegratorLink === intId ? "text-atalaia-neon" : ""} />
                                                {copiedIntegratorLink === intId ? 'Copiado!' : 'Copiar Link'}
                                            </button>
                                            <a
                                                href={clientLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-atalaia-neon hover:underline flex items-center gap-0.5"
                                            >
                                                <ExternalLink size={11} /> Abrir
                                            </a>
                                        </div>
                                    </div>
                                    <code className="text-[11px] font-mono text-zinc-300 select-all block truncate bg-zinc-950 p-1.5 rounded border border-white/5" title={clientLink}>
                                        {clientLink}
                                    </code>
                                </div>
                            </div>

                            {/* AÇÕES: GERAR INDEX.HTML + EDITAR + APAGAR */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 mt-4 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setSelectedIntegratorForCode(intUser)}
                                    className="px-3 py-1.5 bg-atalaia-neon/20 hover:bg-atalaia-neon/30 text-atalaia-neon border border-atalaia-neon/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <Code size={13} /> Gerar index.html Completo
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditIntegrator(intUser)}
                                        className="text-[11px] text-zinc-400 hover:text-white font-bold uppercase flex items-center gap-1 cursor-pointer"
                                    >
                                        <Edit2 size={12} /> Editar
                                    </button>
                                    <button
                                        onClick={() => setIntegratorToDelete(intUser)}
                                        className="text-[11px] text-red-400 hover:text-red-300 font-bold uppercase flex items-center gap-1 cursor-pointer"
                                    >
                                        <Trash2 size={12} /> Apagar
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResidents.map(resident => (
                    <Card key={resident.id} className="p-4 sm:p-5 bg-[#0a0a0a] border border-white/5 hover:border-atalaia-neon/30 rounded-2xl transition-all shadow-md flex flex-col justify-between">
                        <div className="space-y-3.5">
                            {/* TOP ROW: AVATAR + USER NAME & ROLES + STATUS BADGE */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 shadow-inner ${
                                        resident.role === UserRole.ADMIN 
                                            ? 'bg-atalaia-neon/10 text-atalaia-neon border border-atalaia-neon/30' 
                                            : (resident.role !== UserRole.RESIDENT || resident.isTeam)
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                : 'bg-zinc-900 text-atalaia-neon border border-white/10'
                                    }`}>
                                        {resident.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white text-sm sm:text-base truncate leading-snug" title={resident.name}>
                                            {resident.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <Badge color={resident.role === UserRole.ADMIN ? 'green' : ((resident.role !== UserRole.RESIDENT || resident.isTeam) ? 'blue' : 'green')}>
                                                {resident.teamRoleTitle || resident.role}
                                            </Badge>
                                            <Badge color={resident.plan === 'PREMIUM' ? 'green' : (resident.plan === 'FAMILY' ? 'yellow' : 'blue')}>
                                                {resident.plan || 'PREMIUM'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* STATUS BADGE */}
                                <div className="shrink-0">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                        resident.approved !== false 
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                                    }`}>
                                        {resident.approved !== false ? 'Liberado ✓' : 'Pendente ⏳'}
                                    </span>
                                </div>
                            </div>

                            {/* CONTACT & LOCATION INFO */}
                            <div className="space-y-1.5 text-xs text-zinc-400 bg-black/40 p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 truncate">
                                    <Mail size={13} className="text-zinc-500 shrink-0" />
                                    <span className="truncate text-zinc-300">{resident.email || 'Sem e-mail'}</span>
                                </div>
                                {resident.phone && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Smartphone size={13} className="text-zinc-500 shrink-0" />
                                        <span className="text-zinc-300 font-mono text-[11px]">{resident.phone}</span>
                                    </div>
                                )}
                                {resident.address && !resident.address.trim().startsWith('{') && (
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin size={13} className="text-zinc-500 shrink-0" />
                                        <span className="truncate text-zinc-400 text-[11px]">{resident.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* SYSTEM & INTEGRATOR PILLS */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-atalaia-neon/10 border border-atalaia-neon/20 text-atalaia-neon font-bold uppercase tracking-wide">
                                    🏡 {neighborhoods.find(n => n.id === resident.neighborhoodId)?.name || 'Sem Bairro Vinculado'}
                                </span>
                                {resident.secondaryNeighborhoodId && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-atalaia-neon/10 border border-atalaia-neon/20 text-atalaia-neon font-bold uppercase tracking-wide">
                                        🏢 + {neighborhoods.find(n => n.id === resident.secondaryNeighborhoodId)?.name || 'Bairro 2'}
                                    </span>
                                )}
                                {(resident.integratorName || resident.integratorId) && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wide">
                                        <Building size={11} />
                                        {resident.integratorName || integrators.find(i => i.id === resident.integratorId)?.companyName || integrators.find(i => i.id === resident.integratorId)?.name || 'Integradora'}
                                    </span>
                                )}
                            </div>

                            {/* PRIVILEGES (FOR TEAM / NON-RESIDENTS) */}
                            {(resident.role !== UserRole.RESIDENT || resident.isTeam) && (
                                <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1.5">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                                        <Shield size={12} className="text-blue-400" /> Privilégios de Acesso da Equipe
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => toggleTeamMemberRead(resident)}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                                                resident.canRead !== false
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                                    : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                                            }`}
                                            title="Clique para alternar permissão de leitura"
                                        >
                                            <Eye size={12} />
                                            <span>Leitura: {resident.canRead !== false ? 'Ativa ✓' : 'Inativa ✕'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleTeamMemberEdit(resident)}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                                                resident.canEdit
                                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                                                    : 'bg-zinc-800 text-zinc-400 border border-white/10 hover:bg-zinc-700'
                                            }`}
                                            title="Clique para alternar permissão de edição"
                                        >
                                            <Edit2 size={12} />
                                            <span>Edição: {resident.canEdit ? 'Ativa ✓' : 'Inativa ✕'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ACTIVE TRIAL BANNER CARDS AND PROGRESS COUNTDOWN */}
                            {resident.promoActive && resident.promoEnd && (
                                <div className="p-3.5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 text-xs text-yellow-300 animate-in fade-in-50 duration-200">
                                    <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
                                        <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-yellow-400">
                                            <Sparkles size={12} className="animate-pulse text-yellow-400" />
                                            Teste Ativo (7 dias)
                                        </span>
                                        {resident.promoCoupon && (
                                            <span className="text-[10px] font-mono bg-yellow-500/20 text-yellow-300 font-semibold px-2 py-0.5 rounded-md">
                                                Cupom: {resident.promoCoupon}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[11px] text-zinc-300">
                                            <span>Tempo restante:</span>
                                            <span className={`font-mono text-xs font-black ${getDaysRemaining(resident.promoEnd) <= 2 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                                                {getDaysRemaining(resident.promoEnd)} {getDaysRemaining(resident.promoEnd) === 1 ? 'dia restante' : 'dias restantes'}
                                            </span>
                                        </div>
                                        
                                        {/* Beautiful progress bar */}
                                        {(() => {
                                            const rem = getDaysRemaining(resident.promoEnd);
                                            const pct = Math.max(0, Math.min(100, Math.round((rem / 7) * 100)));
                                            return (
                                                <div className="w-full bg-zinc-900 border border-white/5 h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-300 ${rem <= 2 ? 'bg-red-500 shadow-md shadow-red-500/20' : 'bg-yellow-500 shadow-md shadow-yellow-500/20'}`} 
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            );
                                        })()}

                                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                            <span>Começo: {resident.promoStart ? new Date(resident.promoStart).toLocaleDateString('pt-BR') : '-'}</span>
                                            <span>Expira: {resident.promoEnd ? new Date(resident.promoEnd).toLocaleDateString('pt-BR') : '-'}</span>
                                        </div>

                                        {(() => {
                                            const residentPayment = payments.find(p => p.user_id === resident.id && p.has_attachment);
                                            if (residentPayment) {
                                                return (
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            disabled={loadingReceiptId === residentPayment.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFetchAndActionReceipt(residentPayment, resident, 'view');
                                                            }}
                                                            className="flex-[4] py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-white disabled:opacity-55 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer animate-in fade-in"
                                                        >
                                                            {loadingReceiptId === residentPayment.id ? (
                                                                <span className="w-3.5 h-3.5 rounded-full border border-t-transparent border-yellow-500 animate-spin"></span>
                                                            ) : (
                                                                <FileText size={12} className="text-yellow-500" />
                                                            )}
                                                            Ver
                                                        </button>
                                                        <button
                                                            disabled={loadingReceiptId === residentPayment.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFetchAndActionReceipt(residentPayment, resident, 'download');
                                                            }}
                                                            className="flex-[6] py-1.5 px-2 bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-55 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer shadow-md"
                                                        >
                                                            {loadingReceiptId === residentPayment.id ? "⏱️..." : "💾 Baixar"}
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ACTION FOOTER */}
                        <div className="pt-3.5 mt-3.5 border-t border-white/5 space-y-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await MockService.updateUserApproval(resident.id, !resident.approved);
                                        await fetchData();
                                        showFeedback(resident.approved !== false ? 'Usuário bloqueado com sucesso!' : 'Usuário liberado com sucesso!', 'success');
                                    } catch (e: any) {
                                        showFeedback('Erro ao alterar status: ' + e.message, 'error');
                                    }
                                }}
                                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                    resident.approved !== false
                                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}
                            >
                                {resident.approved !== false ? <Lock size={15} /> : <Check size={15} />}
                                {resident.approved !== false ? 'Bloquear Acesso' : 'Liberar Acesso Agora'}
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => { 
                                        if (resident.role !== UserRole.RESIDENT || !!resident.isTeam) {
                                            startEditingTeamMember(resident);
                                            setIsCreateTeamModalOpen(true);
                                        } else {
                                            setEditingUser(resident); 
                                            setEditName(resident.name); 
                                            setEditEmail(resident.email || '');
                                            setEditPhone(resident.phone || ''); 
                                            setEditAddress(resident.address && !resident.address.trim().startsWith('{') ? resident.address : '');
                                            setEditHoodId(resident.neighborhoodId || ''); 
                                            setEditSecondaryHoodId(resident.secondaryNeighborhoodId || '');
                                            setEditIntegratorId(resident.integratorId || (user?.role === UserRole.INTEGRATOR ? user.id : ''));
                                            setEditPlan(resident.plan || 'PREMIUM'); 
                                            setEditRole(resident.role); 
                                            setEditApproved(resident.approved !== false);
                                            setEditCanRead(resident.canRead !== false);
                                            setEditCanEdit(resident.canEdit === true);
                                            setEditSinglePlanPrice(resident.singlePlanPrice ? String(resident.singlePlanPrice) : '49,90');
                                            setEditHasCameraRental(Boolean(resident.hasCameraRental));
                                            setEditCameraRentalDetails(resident.cameraRentalDetails || '');
                                            setEditRecordingDays(Number(resident.recordingDays || 7));
                                            setModalIntegratorSearch('');
                                            setIsEditModalOpen(true); 
                                        }
                                    }} 
                                    className="h-10 px-3 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all" 
                                    title={resident.role !== UserRole.RESIDENT || !!resident.isTeam ? "Editar Membro da Equipe" : "Editar Cliente"}
                                >
                                    <Edit2 size={14} className="pointer-events-none" />
                                    <span>Editar</span>
                                </button>
                                {user?.id !== resident.id ? (
                                    <button 
                                        onClick={() => setUserToDelete(resident)} 
                                        className="h-10 px-3 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all" 
                                        title={resident.role !== UserRole.RESIDENT || !!resident.isTeam ? "Excluir Membro da Equipe" : "Excluir Cliente"}
                                    >
                                        <Trash2 size={14} className="pointer-events-none" />
                                        <span>Excluir</span>
                                    </button>
                                ) : (
                                    <div className="h-10 flex items-center justify-center text-[10px] text-zinc-500 font-bold uppercase">
                                        Seu Usuário
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )}

        {/* MODAL: INCLUIR NOVO CLIENTE NA BASE */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
            <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <UserPlus className="text-atalaia-neon" size={24} />
                    Incluir Novo Cliente na Base
                </h2>
                <p className="text-xs text-zinc-400 mb-6">
                    Cadastre o cliente diretamente vinculado à conta da Empresa Integradora e ao seu sistema de monitoramento.
                </p>

                <form onSubmit={handleCreateClient} className="space-y-4">
                    <Input label="Nome Completo do Cliente" placeholder="Ex: João da Silva" value={newName} onChange={e => setNewName(e.target.value)} required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="E-mail de Acesso" type="email" placeholder="cliente@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                        <Input label="Senha Inicial" type="text" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Telefone / WhatsApp" placeholder="48999999999" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <Input label="Endereço Completo" placeholder="Rua, Número, Complemento" value={newAddress} onChange={e => setNewAddress(e.target.value)} />
                    </div>

                    {/* VÍNCULO COM EMPRESA INTEGRADORA (FILTRO DE BUSCA) */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2.5">
                        <label className="text-[10px] text-atalaia-neon uppercase font-black flex items-center gap-1.5">
                            <Building size={13} /> Empresa Integradora (Base da Conta)
                        </label>
                        {user?.role === UserRole.INTEGRATOR ? (
                            <div className="p-3 rounded-lg bg-atalaia-neon/10 border border-atalaia-neon/30 text-xs text-white flex items-center justify-between">
                                <span>
                                    🏢 <strong>{user.companyName || user.razaoSocial || user.name}</strong>
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-atalaia-neon text-black font-black uppercase">
                                    Sua Base
                                </span>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Buscar empresa integradora por nome ou e-mail..."
                                        value={createIntegratorSearch}
                                        onChange={e => setCreateIntegratorSearch(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-atalaia-neon outline-none"
                                    />
                                </div>
                                <select
                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white focus:border-atalaia-neon outline-none"
                                    value={newIntegratorId}
                                    onChange={e => {
                                        const intId = e.target.value;
                                        setNewIntegratorId(intId);
                                        if (intId) {
                                            const linkedHood = neighborhoods.find(h => h.integratorId === intId);
                                            if (linkedHood) setNewHoodId(linkedHood.id);
                                        }
                                    }}
                                >
                                    <option value="">Sem Integradora Específica (Geral)</option>
                                    {integrators
                                        .filter(i => {
                                            if (!createIntegratorSearch.trim()) return true;
                                            const q = createIntegratorSearch.toLowerCase();
                                            return (
                                                (i.companyName || i.name || '').toLowerCase().includes(q) ||
                                                (i.email || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .map(i => (
                                            <option key={i.id} value={i.id}>
                                                {i.companyName || i.razaoSocial || i.name} ({i.email})
                                            </option>
                                        ))}
                                </select>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Papel</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
                                <option value={UserRole.RESIDENT}>Cliente (Morador)</option>
                                <option value={UserRole.SCR}>Motovigia (SCR)</option>
                                {user?.role === UserRole.ADMIN && (
                                    <>
                                        <option value={UserRole.INTEGRATOR}>Empresa Integradora</option>
                                        <option value={UserRole.ADMIN}>Administrador</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Plano</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newPlan} onChange={e => setNewPlan(e.target.value as UserPlan)}>
                                <option value="PREMIUM">PREMIUM</option>
                                <option value="PREMIUM">PREMIUM</option>
                                <option value="PREMIUM">PREMIUM</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro / Sistema Principal</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newHoodId} onChange={e => setNewHoodId(e.target.value)}>
                                <option value="">Sem Bairro</option>
                                {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro Secundário (Opcional)</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newSecondaryHoodId} onChange={e => setNewSecondaryHoodId(e.target.value)}>
                                <option value="">Sem Bairro Secundário</option>
                                {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Status de Acesso</label>
                        <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newApproved ? 'true' : 'false'} onChange={e => setNewApproved(e.target.value === 'true')}>
                            <option value="true">✅ Acesso Liberado (Ativo Imediatamente)</option>
                            <option value="false">⏳ Aguardando Aprovação (Bloqueado)</option>
                        </select>
                    </div>

                    {/* PLAN CONFIGURATION */}
                    <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3">
                        <span className="text-xs font-bold text-atalaia-neon uppercase tracking-wider block flex items-center gap-2">
                            <Sliders size={14} /> Configurações de Plano do Cliente
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Valor do Plano (R$)" value={newSinglePlanPrice} onChange={e => setNewSinglePlanPrice(e.target.value)} />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Dias Gravação</label>
                                <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={newRecordingDays} onChange={e => setNewRecordingDays(Number(e.target.value))}>
                                    {[0, 1, 3, 7, 15, 30].map(d => <option key={d} value={d}>{d === 0 ? 'Ao Vivo (0 dias)' : `${d} dias`}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <input type="checkbox" checked={newHasCameraRental} onChange={e => setNewHasCameraRental(e.target.checked)} className="accent-atalaia-neon" />
                             <label className="text-xs text-zinc-300">Locação de Câmeras Inclusa</label>
                        </div>
                        {newHasCameraRental && <Input label="Detalhes da Locação" value={newCameraRentalDetails} onChange={e => setNewCameraRentalDetails(e.target.value)} />}
                    </div>

                    <Button type="submit" disabled={creatingUser} className="w-full h-12 mt-4 font-bold uppercase tracking-widest">
                        {creatingUser ? <><Loader2 className="animate-spin mr-2" size={18} /> Cadastrando Cliente...</> : 'Incluir Cliente na Base'}
                    </Button>
                </form>
            </div>
        </Modal>

        <Modal isOpen={isCreateIntegratorModalOpen} onClose={() => setIsCreateIntegratorModalOpen(false)}>
            <form onSubmit={handleCreateIntegrator} className="p-6 md:p-8 space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">Incluir Empresa Integradora</h2>
                <Input label="Nome da Empresa / Nome Fantasia" value={integratorName} onChange={e => setIntegratorName(e.target.value)} required />
                <Input label="E-mail de Acesso" type="email" value={integratorEmail} onChange={e => setIntegratorEmail(e.target.value)} required />
                <div>
                    <Input label="Telefone / WhatsApp (com DDD)" placeholder="Ex: (48) 99999-9999" value={integratorPhone} onChange={e => setIntegratorPhone(e.target.value)} />
                    <p className="text-[10px] text-zinc-400 mt-1">
                        * O WhatsApp cadastrado aqui exibirá automaticamente o botão de atendimento no cabeçalho do sistema.
                    </p>
                </div>
                <Input label="Senha Inicial" type="text" value={integratorPassword} onChange={e => setIntegratorPassword(e.target.value)} required />
                <Input label="CNPJ" value={integratorCnpj} onChange={e => setIntegratorCnpj(e.target.value)} />
                <Input label="Razão Social" value={integratorRazaoSocial} onChange={e => setIntegratorRazaoSocial(e.target.value)} />
                <Button type="submit" disabled={creatingUser} className="w-full">
                    {creatingUser ? 'Cadastrando...' : 'Incluir Empresa'}
                </Button>
            </form>
        </Modal>

        {/* MODAL: EDITAR EMPRESA INTEGRADORA */}
        <Modal isOpen={Boolean(editingIntegrator)} onClose={() => setEditingIntegrator(null)}>
            {editingIntegrator && (
                <form onSubmit={handleSaveIntegratorEdit} className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <Building className="text-atalaia-neon" size={20} />
                            <h2 className="text-lg font-bold text-white">Editar Empresa Integradora</h2>
                        </div>
                    </div>

                    <div className="p-3 bg-atalaia-neon/10 border border-atalaia-neon/20 rounded-xl text-xs text-zinc-300">
                        Configure os dados e o <strong>WhatsApp oficial</strong> da integradora. Este número é o que gera o botão de atendimento no topo do painel para os clientes.
                    </div>

                    <Input label="Nome da Empresa / Nome Fantasia" value={editIntName} onChange={e => setEditIntName(e.target.value)} required />
                    
                    <div>
                        <Input 
                            label="Telefone / WhatsApp (com DDD)" 
                            placeholder="Ex: (48) 99999-9999" 
                            value={editIntPhone} 
                            onChange={e => setEditIntPhone(e.target.value)} 
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                            * Se preenchido, o botão verde &quot;WhatsApp&quot; aparecerá no topo do cabeçalho ao lado do nome da integradora.
                        </p>
                    </div>

                    <Input label="E-mail de Acesso" type="email" value={editIntEmail} onChange={e => setEditIntEmail(e.target.value)} />
                    <Input label="CNPJ" value={editIntCnpj} onChange={e => setEditIntCnpj(e.target.value)} />
                    <Input label="Razão Social" value={editIntRazaoSocial} onChange={e => setEditIntRazaoSocial(e.target.value)} />
                    <Input label="URL do Logotipo da Empresa" placeholder="https://..." value={editIntLogo} onChange={e => setEditIntLogo(e.target.value)} />
                    <Input label="Nova Senha (deixe em branco para manter atual)" type="text" placeholder="Mínimo 6 dígitos" value={editIntPassword} onChange={e => setEditIntPassword(e.target.value)} />

                    <div className="pt-2 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setEditingIntegrator(null)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={savingIntegratorEdit} className="flex-1 bg-atalaia-neon hover:bg-atalaia-neon/90 text-black font-bold">
                            {savingIntegratorEdit ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>

        {/* MODAL: GERADOR DE CÓDIGO E LINK DA INTEGRADORA */}
        <Modal isOpen={Boolean(selectedIntegratorForCode)} onClose={() => setSelectedIntegratorForCode(null)}>
            {selectedIntegratorForCode && (() => {
                const intId = selectedIntegratorForCode.id;
                const isAlien = selectedIntegratorForCode.id === 'alienmonitoramento-integrator-id' || 
                                selectedIntegratorForCode.id === 'a11e9920-6765-4f81-b454-e6778b77ee66' ||
                                (selectedIntegratorForCode.companyName || '').toLowerCase().includes('alien') ||
                                (selectedIntegratorForCode.name || '').toLowerCase().includes('alien') ||
                                (selectedIntegratorForCode.email || '').toLowerCase().includes('alien');
                const systemUuid = isAlien ? 'a11e9920-6765-4f81-b454-e6778b77ee66' : intId;
                const slugId = isAlien ? 'alienmonitoramento-integrator-id' : (selectedIntegratorForCode.customSlug || null);
                const intName = selectedIntegratorForCode.companyName || selectedIntegratorForCode.razaoSocial || selectedIntegratorForCode.name || 'Central de Monitoramento';
                const baseOrigin = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) 
                    ? window.location.origin 
                    : 'https://ais-dev-6poc3il3qcyznrtjn4rips-44114112762.us-west2.run.app';
                const clientUrl = isAlien 
                    ? `${baseOrigin}/#/logincliente?integrator=alienmonitoramento-integrator-id`
                    : `${baseOrigin}/#/logincliente?integrator=${intId}`;
                const indexCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${intName} - Câmeras</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        iframe { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; margin: 0; padding: 0; overflow: hidden; }
    </style>
</head>
<body>
    <iframe 
        src="${clientUrl}" 
        title="Portal de Monitoramento" 
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
    </iframe>
</body>
</html>`;
                const iframeCode = `<iframe src="${clientUrl}" style="width: 100%; height: 100vh; border: none;" title="Portal de Monitoramento" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

                return (
                    <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto space-y-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-atalaia-neon/10 border border-atalaia-neon/30 flex items-center justify-center text-atalaia-neon font-bold shrink-0">
                                    <Building size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{intName}</h2>
                                    <p className="text-xs text-zinc-400">Códigos de integração e links oficiais para clientes</p>
                                </div>
                            </div>
                        </div>

                        {/* ID DO INTEGRADOR */}
                        <div className="p-3.5 bg-black/60 border border-atalaia-neon/20 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-atalaia-neon font-black uppercase tracking-wider flex items-center gap-1">
                                    <Shield size={12} /> Código de ID (Sistema UUID)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(systemUuid);
                                        setCopiedIntegratorId(systemUuid);
                                        setTimeout(() => setCopiedIntegratorId(null), 2500);
                                    }}
                                    className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                    <Copy size={12} className={copiedIntegratorId === systemUuid ? "text-atalaia-neon" : ""} />
                                    {copiedIntegratorId === systemUuid ? 'Copiado!' : 'Copiar Código'}
                                </button>
                            </div>
                            <code className="text-xs font-mono text-white select-all block break-all bg-zinc-950 p-2 rounded-lg border border-white/5">
                                {systemUuid}
                            </code>

                            {slugId && (
                                <div className="pt-2 border-t border-white/5 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                                            <Tag size={12} /> Identificador Amigável (Slug)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(slugId);
                                                setCopiedIntegratorId(slugId);
                                                setTimeout(() => setCopiedIntegratorId(null), 2500);
                                            }}
                                            className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                        >
                                            <Copy size={12} className={copiedIntegratorId === slugId ? "text-atalaia-neon" : ""} />
                                            {copiedIntegratorId === slugId ? 'Copiado!' : 'Copiar Slug'}
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-amber-300/90 select-all block break-all bg-zinc-950 p-2 rounded-lg border border-amber-500/20">
                                        {slugId}
                                    </code>
                                </div>
                            )}
                        </div>

                        {/* LINK DOS CLIENTES */}
                        <div className="p-3.5 bg-black/60 border border-atalaia-neon/20 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-atalaia-neon font-black uppercase tracking-wider flex items-center gap-1">
                                    <Globe size={12} /> Link Direto dos Clientes (/logincliente)
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(clientUrl);
                                            setCopiedIntegratorLink(intId);
                                            setTimeout(() => setCopiedIntegratorLink(null), 2500);
                                        }}
                                        className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                        <Copy size={12} className={copiedIntegratorLink === intId ? "text-atalaia-neon" : ""} />
                                        {copiedIntegratorLink === intId ? 'Copiado!' : 'Copiar Link'}
                                    </button>
                                    <a
                                        href={clientUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-atalaia-neon hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink size={12} /> Visualizar
                                    </a>
                                </div>
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={clientUrl}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 select-all outline-none"
                            />
                        </div>

                        {/* CÓDIGO EMBED: INDEX.HTML OU IFRAME */}
                        <div className="p-4 bg-zinc-950/80 border border-white/10 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Code size={14} className="text-atalaia-neon" /> Código Pronto para Hospedagem
                                </span>
                                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/10 text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCodeTab('index')}
                                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${activeCodeTab === 'index' ? 'bg-atalaia-neon text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        index.html Completo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveCodeTab('iframe')}
                                        className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${activeCodeTab === 'iframe' ? 'bg-atalaia-neon text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Apenas &lt;iframe&gt;
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                                {activeCodeTab === 'index' ? (
                                    <>
                                        Salve este conteúdo como <code>index.html</code> e hospede na pasta do site do integrador (ex: <code>site.com.br/cameras/</code>). Os clientes acessarão sob o <strong>domínio próprio</strong> da empresa com a marca vinculada!
                                    </>
                                ) : (
                                    <>
                                        Cole esta tag <code>&lt;iframe&gt;</code> diretamente dentro de uma página existente no WordPress, Wix ou construtor do cliente.
                                    </>
                                )}
                            </p>

                            <textarea
                                readOnly
                                className="w-full h-32 bg-black border border-white/10 rounded-xl p-3 text-[11px] font-mono text-zinc-300 select-all outline-none resize-none leading-relaxed"
                                value={activeCodeTab === 'index' ? indexCode : iframeCode}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(indexCode);
                                        setCopiedModalIndexHtml(true);
                                        setTimeout(() => setCopiedModalIndexHtml(false), 2500);
                                    }}
                                    className="px-3 h-10 bg-atalaia-neon/20 hover:bg-atalaia-neon/30 border border-atalaia-neon/30 rounded-xl text-xs font-bold text-atalaia-neon transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Copy size={13} className={copiedModalIndexHtml ? "text-atalaia-neon" : "text-atalaia-neon"} />
                                    {copiedModalIndexHtml ? 'index.html Copiado! ✅' : 'Copiar index.html'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(iframeCode);
                                        setCopiedModalIframe(true);
                                        setTimeout(() => setCopiedModalIframe(false), 2500);
                                    }}
                                    className="px-3 h-10 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Copy size={13} className={copiedModalIframe ? "text-atalaia-neon" : "text-zinc-400"} />
                                    {copiedModalIframe ? 'Tag <iframe> Copiada! ✅' : 'Copiar Apenas <iframe>'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="secondary" onClick={() => setSelectedIntegratorForCode(null)}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                );
            })()}
        </Modal>

        {/* MODAL: EDITAR CLIENTE / USUÁRIO */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
            <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-6">
                    {user?.role === UserRole.INTEGRATOR ? 'Editar Cliente da Base' : 'Editar Usuário no Banco'}
                </h2>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                    <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="E-mail" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        <Input label="Telefone / WhatsApp" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                    </div>
                    <Input label="Endereço Completo" placeholder="Rua, Número, Bairro" value={editAddress} onChange={e => setEditAddress(e.target.value)} />

                    {/* VÍNCULO COM EMPRESA INTEGRADORA */}
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 space-y-2">
                        <label className="text-[10px] text-atalaia-neon uppercase font-black flex items-center gap-1.5">
                            <Building size={13} /> Empresa Integradora Vinculada (Conta)
                        </label>
                        {user?.role === UserRole.INTEGRATOR ? (
                            <div className="p-3 rounded-lg bg-atalaia-neon/10 border border-atalaia-neon/30 text-xs text-white flex items-center justify-between">
                                <span>🏢 <strong>{user.companyName || user.razaoSocial || user.name}</strong></span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-atalaia-neon text-black font-black uppercase">Sua Base</span>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar empresa integradora..."
                                        value={modalIntegratorSearch}
                                        onChange={e => setModalIntegratorSearch(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-atalaia-neon outline-none"
                                    />
                                </div>
                                <select
                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white"
                                    value={editIntegratorId}
                                    onChange={e => setEditIntegratorId(e.target.value)}
                                >
                                    <option value="">Sem Empresa Integradora Vinculada</option>
                                    {integrators
                                        .filter(i => {
                                            if (!modalIntegratorSearch.trim()) return true;
                                            const q = modalIntegratorSearch.toLowerCase();
                                            return (
                                                (i.companyName || i.name || '').toLowerCase().includes(q) ||
                                                (i.email || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .map(i => (
                                            <option key={i.id} value={i.id}>
                                                {i.companyName || i.razaoSocial || i.name} ({i.email})
                                            </option>
                                        ))}
                                </select>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Papel</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}>
                                <option value={UserRole.RESIDENT}>Cliente</option>
                                <option value={UserRole.SCR}>Motovigia (SCR)</option>
                                {user?.role === UserRole.ADMIN && (
                                    <>
                                        <option value={UserRole.INTEGRATOR}>Empresa Integradora</option>
                                        <option value={UserRole.ADMIN}>Administrador</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Plano</label>
                            <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" value={editPlan} onChange={e => setEditPlan(e.target.value)}>
                                <option value="PREMIUM">PREMIUM</option>
                                <option value="PREMIUM">PREMIUM</option>
                                <option value="PREMIUM">PREMIUM</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Status de Acesso</label>
                        <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" value={editApproved ? 'true' : 'false'} onChange={e => setEditApproved(e.target.value === 'true')}>
                            <option value="true">✅ Acesso Liberado (Ativo)</option>
                            <option value="false">⏳ Aguardando Aprovação (Bloqueado)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro / Sistema</label>
                        <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" value={editHoodId} onChange={e => setEditHoodId(e.target.value)}>
                            <option value="">Sem Bairro</option>
                            {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro Secundário (Opcional - Duplo Acesso)</label>
                        <select className="w-full bg-black border border-white/10 rounded-xl p-4 text-white" value={editSecondaryHoodId} onChange={e => setEditSecondaryHoodId(e.target.value)}>
                            <option value="">Sem Bairro Secundário</option>
                            {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </div>

                    {/* PRIVILÉGIOS DE ACESSO (LEITURA E EDIÇÃO) */}
                    <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-atalaia-neon uppercase tracking-wider flex items-center gap-1.5">
                                <Sliders size={14} /> Privilégios e Plano do Cliente
                            </span>
                        </div>

                        {/* PLAN CONFIGURATION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Valor do Plano (R$)" value={editSinglePlanPrice} onChange={e => setEditSinglePlanPrice(e.target.value)} />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Dias Gravação</label>
                                <select className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm" value={editRecordingDays} onChange={e => setEditRecordingDays(Number(e.target.value))}>
                                    {[0, 1, 3, 7, 15, 30].map(d => <option key={d} value={d}>{d === 0 ? 'Ao Vivo (0 dias)' : `${d} dias`}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <input type="checkbox" checked={editHasCameraRental} onChange={e => setEditHasCameraRental(e.target.checked)} className="accent-atalaia-neon" />
                             <label className="text-xs text-zinc-300">Locação de Câmeras Inclusa</label>
                        </div>
                        {editHasCameraRental && <Input label="Detalhes da Locação" value={editCameraRentalDetails} onChange={e => setEditCameraRentalDetails(e.target.value)} />}

                        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                            <div>
                                <p className="text-xs font-bold text-white">Privilégio de Leitura</p>
                                <p className="text-[10px] text-zinc-400">Permite visualizar clientes, sistemas, câmeras e registros</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditCanRead(!editCanRead)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                                    editCanRead 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                                        : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                }`}
                            >
                                {editCanRead ? '✓ Ativado' : '✕ Desativado'}
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                            <div>
                                <p className="text-xs font-bold text-white">Privilégio de Edição</p>
                                <p className="text-[10px] text-zinc-400">Permite cadastrar, modificar dados, aprovar acessos e alterar configurações</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditCanEdit(!editCanEdit)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                                    editCanEdit 
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm' 
                                        : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                }`}
                            >
                                {editCanEdit ? '✓ Ativado' : '✕ Desativado'}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" disabled={savingUser} className="w-full h-12 mt-4 font-bold uppercase tracking-widest">
                        {savingUser ? <><Loader2 className="animate-spin mr-2" size={18} /> Salvando...</> : 'Salvar Alterações'}
                    </Button>
                </form>
            </div>
        </Modal>

        {/* MODAL: INCLUIR / GERENCIAR EQUIPE */}
        <Modal isOpen={isCreateTeamModalOpen} onClose={() => { setIsCreateTeamModalOpen(false); setEditingTeamMember(null); }}>
            <div className="p-4 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4 gap-2">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Users className="text-blue-500 shrink-0" size={24} />
                            <span>Gestão e Inclusão da Equipe</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                            Cadastre, edite, exclua e configure privilégios de leitura e edição dos membros da equipe.
                        </p>
                    </div>
                    <button onClick={() => { setIsCreateTeamModalOpen(false); setEditingTeamMember(null); }} className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* SUB-TABS INTERNAS DO MODAL (HORIZONTAL SCROLL ON MOBILE) */}
                <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 sm:pb-4 mb-4 sm:mb-6 overflow-x-auto no-scrollbar scrollbar-none">
                    <button
                        type="button"
                        onClick={() => { setTeamModalTab('list'); setEditingTeamMember(null); }}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            teamModalTab === 'list'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-black'
                                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Users size={14} />
                        <span>Membros da Equipe ({totalTeam})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTeamModalTab('create'); setEditingTeamMember(null); }}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                            teamModalTab === 'create'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-black'
                                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <UserPlus size={14} />
                        <span>Incluir Novo Membro</span>
                    </button>
                    {teamModalTab === 'edit' && editingTeamMember && (
                        <button
                            type="button"
                            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black whitespace-nowrap shrink-0"
                        >
                            <Edit2 size={14} />
                            <span>Editando: {editingTeamMember.name}</span>
                        </button>
                    )}
                </div>

                {/* CONTEÚDO DA ABA LIST */}
                {teamModalTab === 'list' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar membro por nome, e-mail, telefone..."
                                    value={teamSearchTerm}
                                    onChange={e => setTeamSearchTerm(e.target.value)}
                                    className="w-full h-11 bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <Button
                                onClick={() => { setTeamModalTab('create'); setEditingTeamMember(null); }}
                                className="h-11 px-4 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                            >
                                <UserPlus size={15} />
                                <span>Novo Membro</span>
                            </Button>
                        </div>

                        {/* LISTA DE MEMBROS DA EQUIPE */}
                        {(() => {
                            const teamList = residents
                                .filter(r => r.role !== UserRole.RESIDENT || !!r.isTeam)
                                .filter(m => {
                                    if (!teamSearchTerm.trim()) return true;
                                    const q = teamSearchTerm.toLowerCase().trim();
                                    return m.name.toLowerCase().includes(q) ||
                                           (m.email && m.email.toLowerCase().includes(q)) ||
                                           (m.phone && m.phone.includes(q)) ||
                                           (m.teamRoleTitle && m.teamRoleTitle.toLowerCase().includes(q));
                                });

                            if (teamList.length === 0) {
                                return (
                                    <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/10 bg-zinc-950/40">
                                        <Users className="mx-auto text-zinc-600 mb-3" size={36} />
                                        <h4 className="text-sm font-bold text-white mb-1">Nenhum membro encontrado</h4>
                                        <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                                            {teamSearchTerm.trim()
                                                ? 'Nenhum membro da equipe corresponde à sua pesquisa.'
                                                : 'Sua equipe ainda não possui operadores ou membros cadastrados.'}
                                        </p>
                                        <Button
                                            onClick={() => setTeamModalTab('create')}
                                            className="h-10 px-4 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white"
                                        >
                                            <UserPlus size={15} className="mr-1.5" /> Cadastrar Primeiro Membro
                                        </Button>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    {teamList.map(member => (
                                        <div
                                            key={member.id}
                                            className="p-3.5 sm:p-4 bg-zinc-950/70 border border-white/10 hover:border-blue-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black flex items-center justify-center shrink-0 text-sm sm:text-base">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                        <strong className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-none">{member.name}</strong>
                                                        <Badge color={member.role === UserRole.ADMIN ? 'green' : 'blue'}>
                                                            {member.teamRoleTitle || member.role}
                                                        </Badge>
                                                        {member.neighborhoodId && (
                                                            <span className="text-[10px] text-atalaia-neon font-bold uppercase bg-atalaia-neon/10 px-2 py-0.5 rounded border border-atalaia-neon/20">
                                                                {neighborhoods.find(n => n.id === member.neighborhoodId)?.name || 'Sistema'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-400 truncate flex items-center gap-2">
                                                        <span className="truncate">{member.email}</span>
                                                        {member.phone && <span className="text-zinc-500 shrink-0">• {member.phone}</span>}
                                                    </p>

                                                    {/* PRIVILÉGIOS TOGGLES DIRETOS NA LISTA */}
                                                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTeamMemberRead(member)}
                                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                                                                member.canRead !== false
                                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                                                    : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                                                            }`}
                                                            title="Clique para alternar permissão de leitura"
                                                        >
                                                            <Eye size={12} />
                                                            <span>Leitura: {member.canRead !== false ? 'Ativa ✓' : 'Inativa ✕'}</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTeamMemberEdit(member)}
                                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                                                                member.canEdit
                                                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                                                                    : 'bg-zinc-800 text-zinc-400 border border-white/10 hover:bg-zinc-700'
                                                            }`}
                                                            title="Clique para alternar permissão de edição"
                                                        >
                                                            <Edit2 size={12} />
                                                            <span>Edição: {member.canEdit ? 'Ativa ✓' : 'Inativa ✕'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BOTÕES DE EDITAR E EXCLUIR */}
                                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 border-t border-white/5 md:border-0 md:pt-0">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingTeamMember(member)}
                                                    className="flex-1 md:flex-none justify-center px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                                                    title="Editar Membro da Equipe"
                                                >
                                                    <Edit2 size={13} />
                                                    <span>Editar</span>
                                                </button>
                                                {user?.id !== member.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setUserToDelete(member)}
                                                        className="flex-1 md:flex-none justify-center px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                                                        title="Excluir Membro da Equipe"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Excluir</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* CONTEÚDO DA ABA CREATE (INCLUIR NOVO MEMBRO) */}
                {teamModalTab === 'create' && (
                    <form onSubmit={handleCreateTeamMember} className="space-y-4 bg-zinc-950/60 p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-blue-400">
                                <UserPlus size={16} /> Incluir Novo Membro na Equipe
                            </h3>
                            <span className="text-[11px] text-zinc-400">Preencha os dados e defina os privilégios</span>
                        </div>

                        <Input 
                            label="Nome Completo do Membro" 
                            required 
                            placeholder="Ex: Carlos Silva (Operador de Monitoramento)" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)} 
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="E-mail de Acesso" 
                                type="email" 
                                required 
                                placeholder="equipe@provedor.com" 
                                value={newTeamEmail} 
                                onChange={e => setNewTeamEmail(e.target.value)} 
                            />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Senha Inicial de Acesso</label>
                                <div className="relative">
                                    <input 
                                        type={showTeamPassword ? "text" : "password"}
                                        required 
                                        minLength={6}
                                        placeholder="Mínimo 6 caracteres" 
                                        value={newTeamPassword} 
                                        onChange={e => setNewTeamPassword(e.target.value)} 
                                        className="w-full bg-black border border-white/10 rounded-xl p-3.5 pr-10 text-white text-sm outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowTeamPassword(!showTeamPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                    >
                                        {showTeamPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Telefone / WhatsApp" 
                                placeholder="(00) 00000-0000" 
                                value={newTeamPhone} 
                                onChange={e => setNewTeamPhone(e.target.value)} 
                            />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Papel / Função na Equipe</label>
                                <select 
                                    className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-blue-500"
                                    value={newTeamRoleTitle} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setNewTeamRoleTitle(val);
                                        if (val === 'Gestor Administrativo') {
                                            setNewTeamRole(UserRole.ADMIN);
                                        } else {
                                            setNewTeamRole(UserRole.SCR);
                                        }
                                    }}
                                >
                                    <option value="Motovigia / Ronda (SCR)">Motovigia / Ronda (SCR)</option>
                                    <option value="Operador de Suporte / Monitoramento">Operador de Suporte / Monitoramento</option>
                                    <option value="Supervisor de Segurança">Supervisor de Segurança</option>
                                    {user?.role === UserRole.ADMIN && (
                                        <option value="Gestor Administrativo">Gestor Administrativo</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro / Sistema Vinculado</label>
                            <select 
                                className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-blue-500" 
                                value={newTeamHoodId} 
                                onChange={e => setNewTeamHoodId(e.target.value)}
                            >
                                <option value="">Todos os Sistemas / Sem Bairro Específico</option>
                                {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>

                        {/* CONDIÇÕES DE ATIVAR E DESATIVAR PRIVILÉGIOS DE LEITURA E EDIÇÃO */}
                        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-3">
                            <span className="text-xs font-bold text-atalaia-neon uppercase tracking-wider block flex items-center gap-2">
                                <Shield size={14} /> Condições de Privilégios de Acesso da Equipe
                            </span>

                            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Eye size={13} className="text-emerald-400" /> Privilégio de Leitura
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Visualizar câmeras ao vivo, relatórios de rondas, alertas e clientes vinculados.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewTeamCanRead(!newTeamCanRead)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                                        newTeamCanRead 
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                                            : 'bg-zinc-900 text-zinc-500 border border-white/10'
                                    }`}
                                >
                                    {newTeamCanRead ? '✓ Ativado' : '✕ Desativado'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Edit2 size={13} className="text-blue-400" /> Privilégio de Edição
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Cadastrar, modificar registros, aprovar acessos e alterar configurações de sistemas.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewTeamCanEdit(!newTeamCanEdit)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                                        newTeamCanEdit 
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10' 
                                            : 'bg-zinc-900 text-zinc-500 border border-white/10'
                                    }`}
                                >
                                    {newTeamCanEdit ? '✓ Ativado' : '✕ Desativado'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTeamModalTab('list')}
                                className="flex-1 h-12 font-bold uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={creatingTeam} 
                                className="flex-1 h-12 font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            >
                                {creatingTeam ? <><Loader2 className="animate-spin mr-2" size={18} /> Cadastrando Membro...</> : 'Incluir Membro na Equipe'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* CONTEÚDO DA ABA EDIT (EDITAR MEMBRO DIRETAMENTE DENTRO DO MODAL) */}
                {teamModalTab === 'edit' && editingTeamMember && (
                    <form onSubmit={handleSaveEditTeamMember} className="space-y-4 bg-zinc-950/60 p-6 rounded-2xl border border-amber-500/30">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setTeamModalTab('list'); setEditingTeamMember(null); }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                                    title="Voltar para a lista"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-amber-400">
                                    <Edit2 size={16} /> Editar Membro da Equipe
                                </h3>
                            </div>
                            <span className="text-[11px] text-zinc-400">Modifique dados e privilégios</span>
                        </div>

                        <Input 
                            label="Nome Completo do Membro" 
                            required 
                            placeholder="Nome do operador ou motovigia" 
                            value={editTeamName} 
                            onChange={e => setEditTeamName(e.target.value)} 
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="E-mail de Acesso" 
                                type="email" 
                                required 
                                placeholder="equipe@provedor.com" 
                                value={editTeamEmail} 
                                onChange={e => setEditTeamEmail(e.target.value)} 
                            />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Alterar Senha (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Deixe vazio para manter a mesma" 
                                    value={editTeamPassword} 
                                    onChange={e => setEditTeamPassword(e.target.value)} 
                                    className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Telefone / WhatsApp" 
                                placeholder="(00) 00000-0000" 
                                value={editTeamPhone} 
                                onChange={e => setEditTeamPhone(e.target.value)} 
                            />
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Papel / Função na Equipe</label>
                                <select 
                                    className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500"
                                    value={editTeamRoleTitle} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setEditTeamRoleTitle(val);
                                        if (val === 'Gestor Administrativo') {
                                            setEditTeamRole(UserRole.ADMIN);
                                        } else {
                                            setEditTeamRole(UserRole.SCR);
                                        }
                                    }}
                                >
                                    <option value="Motovigia / Ronda (SCR)">Motovigia / Ronda (SCR)</option>
                                    <option value="Operador de Suporte / Monitoramento">Operador de Suporte / Monitoramento</option>
                                    <option value="Supervisor de Segurança">Supervisor de Segurança</option>
                                    {user?.role === UserRole.ADMIN && (
                                        <option value="Gestor Administrativo">Gestor Administrativo</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-black mb-1 block">Bairro / Sistema Vinculado</label>
                            <select 
                                className="w-full bg-black border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500" 
                                value={editTeamHoodId} 
                                onChange={e => setEditTeamHoodId(e.target.value)}
                            >
                                <option value="">Todos os Sistemas / Sem Bairro Específico</option>
                                {neighborhoods.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>

                        {/* CONDIÇÕES DE ATIVAR E DESATIVAR PRIVILÉGIOS DE LEITURA E EDIÇÃO */}
                        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-3">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-2">
                                <Shield size={14} /> Condições de Privilégios de Acesso da Equipe
                            </span>

                            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Eye size={13} className="text-emerald-400" /> Privilégio de Leitura
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Visualizar câmeras ao vivo, relatórios de rondas, alertas e clientes vinculados.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditTeamCanRead(!editTeamCanRead)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                                        editTeamCanRead 
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                                            : 'bg-zinc-900 text-zinc-500 border border-white/10'
                                    }`}
                                >
                                    {editTeamCanRead ? '✓ Ativado' : '✕ Desativado'}
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Edit2 size={13} className="text-blue-400" /> Privilégio de Edição
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Cadastrar, modificar registros, aprovar acessos e alterar configurações de sistemas.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditTeamCanEdit(!editTeamCanEdit)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                                        editTeamCanEdit 
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10' 
                                            : 'bg-zinc-900 text-zinc-500 border border-white/10'
                                    }`}
                                >
                                    {editTeamCanEdit ? '✓ Ativado' : '✕ Desativado'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setTeamModalTab('list'); setEditingTeamMember(null); }}
                                className="flex-1 h-12 font-bold uppercase tracking-wider text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={savingTeamMember} 
                                className="flex-1 h-12 font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 font-black"
                            >
                                {savingTeamMember ? <><Loader2 className="animate-spin mr-2" size={18} /> Salvando...</> : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>

        <AnimatePresence>
            {userToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            {(userToDelete.role !== UserRole.RESIDENT || userToDelete.isTeam) ? 'Excluir Membro da Equipe' : 'Excluir Cliente'}
                        </h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                            Deseja realmente excluir permanentemente o cadastro de <span className="text-white font-bold">"{userToDelete.name}"</span> do sistema?
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (userToDelete) {
                                        try {
                                            await MockService.deleteUser(userToDelete.id);
                                            await fetchData();
                                            showFeedback('Usuário excluído com sucesso!', 'success');
                                        } catch (e: any) {
                                            showFeedback('Erro ao excluir: ' + e.message, 'error');
                                        }
                                        setUserToDelete(null);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/15 cursor-pointer font-sans"
                             >
                                 Excluir
                             </button>
                         </div>
                     </motion.div>
                 </div>
            )}
            {integratorToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1 }}
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center"
                    >
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-mono">
                            Excluir Integradora
                        </h3>
                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-sans">
                            Deseja realmente excluir permanentemente a integradora <span className="text-white font-bold">"{integratorToDelete.companyName || integratorToDelete.razaoSocial || integratorToDelete.name}"</span> do sistema? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIntegratorToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-sans"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (integratorToDelete) {
                                        try {
                                            await MockService.deleteUser(integratorToDelete.id);
                                            showFeedback('Integradora excluída com sucesso!', 'success');
                                            /* Recarregar dados */
                                            await fetchData();
                                        } catch (err: any) {
                                            showFeedback('Erro ao excluir integradora: ' + err.message, 'error');
                                        }
                                        setIntegratorToDelete(null);
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/15 cursor-pointer font-sans"
                             >
                                 Excluir
                             </button>
                         </div>
                     </motion.div>
                 </div>
            )}
        </AnimatePresence>
       </div>
          {/* VISUALIZAÇÃO DE COMPROVANTE */}
          {selectedReceipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Comprovante de Teste</span>
                    <h3 className="text-lg font-black text-white">{selectedReceipt.userName}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1 px-3 text-xs bg-zinc-900 border border-white/10 text-white rounded-lg hover:bg-zinc-800 transition-colors uppercase font-bold cursor-pointer font-sans"
                  >
                    Fechar
                  </button>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl mb-4 text-xs flex justify-between items-center text-zinc-300 font-sans">
                  <div>
                    <span className="text-zinc-500">Arquivo:</span> <strong className="text-white ml-2">{selectedReceipt.name}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500">Valor Pago:</span> <strong className="text-yellow-500 ml-2">R$ {selectedReceipt.amount.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="flex-1 bg-black rounded-lg border border-white/5 overflow-auto flex items-center justify-center p-4 min-h-[300px]">
                  {selectedReceipt.base64.startsWith('data:application/pdf') || selectedReceipt.name.toLowerCase().endsWith('.pdf') ? (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-12 h-12 bg-red-400/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <FileText size={28} />
                      </div>
                      <p className="text-xs text-zinc-400 font-bold">Documento PDF Incorporado</p>
                      <a 
                        href={selectedReceipt.base64} 
                        download={selectedReceipt.name}
                        className="inline-flex items-center justify-center px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md font-sans"
                      >
                        💾 Baixar PDF para Visualizar
                      </a>
                    </div>
                  ) : (
                    <img 
                      referrerPolicy="no-referrer"
                      src={selectedReceipt.base64} 
                      alt="Comprovante de pagamento" 
                      className="max-w-full max-h-[50vh] object-contain rounded border border-white/5 shadow"
                    />
                  )}
                </div>

                <div className="mt-4 flex gap-2 justify-end font-sans">
                  <a 
                    href={selectedReceipt.base64} 
                    download={selectedReceipt.name}
                    className="px-4 py-2 bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 rounded-xl text-xs uppercase font-bold tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    💾 Baixar Arquivo
                  </a>
                  <button 
                    onClick={() => setSelectedReceipt(null)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    Concluído
                  </button>
                </div>
              </div>
            </div>
          )}
    </Layout>
  );
};

export default IntegratorUsers;
