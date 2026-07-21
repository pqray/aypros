-- Fase 20 (P1): sugestão de custo/margem via IA no estimador de proposta.
alter type public.ai_kind add value if not exists 'cost_estimate';
