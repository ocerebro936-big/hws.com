interface LegalModalProps {
  onClose: () => void;
}

export function TermosDeUso({ onClose }: LegalModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#131a26] border-b border-[#1e293b] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-display">Termos de Uso e Condições do Ecossistema</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <p><strong className="text-white">Última atualização:</strong> Maio de 2026</p>

          <h3 className="text-sm font-bold text-white mt-4">1. Aceitação dos Termos</h3>
          <p>Ao aceder e utilizar o Hub World Shopping (HWS), operado pela Bluewhite Corporation Lda., com sede em Moçambique, o utilizador declara ter lido, compreendido e aceitado os presentes Termos de Uso.</p>

          <h3 className="text-sm font-bold text-white mt-4">2. Propriedade Intelectual</h3>
          <p>O motor de inteligência artificial, algoritmos de design dinâmico, sistema de recomendação, ferramentas de optimização de imagem e todo o código-fonte do HWS são propriedade exclusiva da Bluewhite Corporation Lda. É expressamente proibida a engenharia reversa, cópia, distribuição ou modificação não autorizada da plataforma.</p>

          <h3 className="text-sm font-bold text-white mt-4">3. Responsabilidade do Lojista</h3>
          <p>Cada lojista é o único e exclusivo responsável pelos produtos, serviços, conteúdos e materiais publicados na sua loja virtual. O HWS atua como infraestrutura tecnológica multifunções e não se responsabiliza por infrações legais cometidas pelos lojistas, incluindo mas não limitado a violação de direitos de autor, propriedade industrial, normas de defesa do consumidor e legislação fiscal moçambicana.</p>

          <h3 className="text-sm font-bold text-white mt-4">4. Uso de Tokens e Créditos</h3>
          <p>As visitas, interações e métricas geradas no ecossistema podem resultar em créditos, pontos ou tokens de recompensa. Estes não possuem valor monetário real até serem expressamente convertidos pela Bluewhite Corporation Lda. através dos mecanismos oficiais da plataforma. A empresa reserva-se o direito de ajustar, suspender ou cancelar saldos em caso de fraude ou abuso.</p>

          <h3 className="text-sm font-bold text-white mt-4">5. Disposições Gerais</h3>
          <p>Estes termos regem-se pelas leis da República de Moçambique. Qualquer litígio será resolvido no foro da Cidade de Maputo. A Bluewhite Corporation Lda. reserva-se o direito de alterar estes termos a qualquer momento, mediante notificação aos utilizadores.</p>
        </div>
        <div className="px-6 py-4 border-t border-[#1e293b]">
          <button onClick={onClose} className="w-full py-2.5 bg-[#4f46e5] hover:bg-[#3730a3] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer">Fechar</button>
        </div>
      </div>
    </div>
  );
}

export function PoliticaPrivacidade({ onClose }: LegalModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#131a26] border-b border-[#1e293b] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-display">Política de Privacidade e Cookies</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <p><strong className="text-white">Última atualização:</strong> Maio de 2026</p>

          <h3 className="text-sm font-bold text-white mt-4">1. Recolha de Dados</h3>
          <p>O HWS recolhe exclusivamente os dados mínimos necessários ao funcionamento da plataforma: ID único criptográfico, nome, email, telemóvel (opcional), localização geográfica (opcional) e métricas de navegação técnica (tempo de permanência, páginas visitadas, interações com anúncios). Não armazenamos dados sensíveis como números de documentos de identificação, dados bancários ou informações de saúde.</p>

          <h3 className="text-sm font-bold text-white mt-4">2. Transparência de Rastreio</h3>
          <p>O sistema de gateway monitoriza o tempo de permanência nas lojas e anúncios para validar tráfego humano legítimo, prevenir fraudes de cliques e calcular recompensas. Este rastreio é anónimo e agregado sempre que possível. O utilizador é informado através desta política e pode optar por não utilizar a plataforma caso não concorde.</p>

          <h3 className="text-sm font-bold text-white mt-4">3. Cookies e Tecnologias Semelhantes</h3>
          <p>Utilizamos cookies essenciais para o funcionamento da plataforma (sessão de ID único) e cookies analíticos para melhoria da experiência. Nenhum cookie é utilizado para publicidade comportamental sem consentimento explícito. O utilizador pode gerir as preferências de cookies nas definições do seu navegador.</p>

          <h3 className="text-sm font-bold text-white mt-4">4. Partilha de Dados</h3>
          <p>Os dados dos utilizadores não são vendidos a terceiros. Podem ser partilhados com autoridades competentes mediante ordem judicial ou obrigação legal nos termos da lei moçambicana. Os lojistas têm acesso apenas às métricas agregadas das suas próprias lojas.</p>

          <h3 className="text-sm font-bold text-white mt-4">5. Direitos do Titular</h3>
          <p>Nos termos da Lei de Proteção de Dados Pessoais de Moçambique, o utilizador tem direito a aceder, rectificar, cancelar e opor-se ao tratamento dos seus dados. Para exercer estes direitos, contacte: privacidade@bluewhitecorporation.co.mz.</p>
        </div>
        <div className="px-6 py-4 border-t border-[#1e293b]">
          <button onClick={onClose} className="w-full py-2.5 bg-[#4f46e5] hover:bg-[#3730a3] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer">Fechar</button>
        </div>
      </div>
    </div>
  );
}

export function Disclaimer({ onClose }: LegalModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-[#131a26] border border-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#131a26] border-b border-[#1e293b] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-display">Declaração de Isenção de Responsabilidade Financeira</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <p><strong className="text-white">Última atualização:</strong> Maio de 2026</p>

          <h3 className="text-sm font-bold text-white mt-4">1. Natureza Educativa</h3>
          <p>As respostas, análises, estratégias e recomendações fornecidas pelo Assistente de IA, incluindo mas não limitado a conselhos sobre negócios, finanças, economia, investimentos e empreendedorismo, possuem caráter <strong className="text-white">exclusivamente educativo e informativo</strong>. Não constituem aconselhamento financeiro, jurídico, fiscal ou de investimento profissional e personalizado.</p>

          <h3 className="text-sm font-bold text-white mt-4">2. Ausência de Relação Fiduciária</h3>
          <p>A utilização do chat de IA não cria qualquer relação fiduciária, de agência, sociedade ou parceria entre o utilizador e a Bluewhite Corporation Lda. ou qualquer das suas entidades relacionadas. O utilizador reconhece que as decisões de negócio, investimento e gestão financeira são da sua inteira e exclusiva responsabilidade.</p>

          <h3 className="text-sm font-bold text-white mt-4">3. Risco e Perdas</h3>
          <p>Investimentos, negócios e atividades financeiras envolvem riscos reais, incluindo a perda total do capital investido. Nenhuma informação fornecida pela plataforma garante retornos, lucros ou resultados específicos. O utilizador deve consultar profissionais qualificados (consultores financeiros, advogados, contabilistas) antes de tomar decisões financeiras.</p>

          <h3 className="text-sm font-bold text-white mt-4">4. Isenção de Garantias</h3>
          <p>A Bluewhite Corporation Lda. não garante a exatidão, completude, atualidade ou adequação das informações geradas pelo assistente de IA. A plataforma é fornecida "como está", sem garantias de qualquer tipo, expressas ou implícitas.</p>

          <h3 className="text-sm font-bold text-white mt-4">5. Aceitação</h3>
          <p>Ao utilizar o chat de IA, o utilizador confirma que leu, compreendeu e aceita integralmente esta declaração de isenção de responsabilidade.</p>
        </div>
        <div className="px-6 py-4 border-t border-[#1e293b]">
          <button onClick={onClose} className="w-full py-2.5 bg-[#4f46e5] hover:bg-[#3730a3] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer">Fechar</button>
        </div>
      </div>
    </div>
  );
}
