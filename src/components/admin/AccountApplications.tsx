import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Phone, Building2, Wallet, Clock, CheckCircle, XCircle, Loader2, MessageCircle, Send, Server, Key, Lock, Eye, EyeOff } from "lucide-react";

const AccountApplications = () => {
  const queryClient = useQueryClient();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const { data: applications, isLoading } = useQuery({
    queryKey: ['account-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_management_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('account_management_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-applications'] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'contacted':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500"><Phone className="h-3 w-3 mr-1" />Contacted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Account Management Applications
          {applications && applications.length > 0 && (
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!applications || applications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No applications yet</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{app.name}</span>
                        {getStatusBadge(app.status || 'pending')}
                        <Badge variant="outline">{app.account_size}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${app.email}`} className="hover:text-primary">{app.email}</a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{app.whatsapp}</span>
                        </div>
                        {app.telegram_username && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Send className="h-4 w-4" />
                            <a
                              href={`https://t.me/${app.telegram_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary"
                            >
                              @{app.telegram_username}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          {app.preferred_broker} {app.platform_type && `(${app.platform_type})`}
                        </div>
                      </div>
                      
                      {(app.broker_server || app.trading_login || app.trading_password) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                          {app.broker_server && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Server className="h-4 w-4 text-primary" />
                              <span className="font-mono text-xs">{app.broker_server}</span>
                            </div>
                          )}
                          {app.trading_login && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Key className="h-4 w-4 text-emerald-500" />
                              <span className="font-mono text-xs">Login: <span className="font-bold text-foreground">{app.trading_login}</span></span>
                            </div>
                          )}
                          {app.trading_password && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4 text-amber-500" />
                              <span className="font-mono text-xs">
                                Pass: <span className="font-bold text-foreground">{visiblePasswords[app.id] ? app.trading_password : '••••••••'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(app.id)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                {visiblePasswords[app.id] ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Applied: {format(new Date(app.created_at), 'PPp')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                        onClick={() => window.open(`https://wa.me/${app.whatsapp.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(app.name)}, regarding your Account Management application for ${encodeURIComponent(app.account_size)} account...`, '_blank')}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Select
                        value={app.status || 'pending'}
                        onValueChange={(value) => updateStatusMutation.mutate({ id: app.id, status: value })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountApplications;
