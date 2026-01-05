import Tooltip from '@/components/ui/Tooltip'

const getGlossaryDefinition = (key) => {
  if (window?.glossaryData) {
    return window.glossaryData[key] ?? '<glossary entry not found>';
  }
  else {
    return '<glossary data missing>';
  }
}

const GlossaryTooltip = ({children, glossaryKey}) => {

  const tooltipText = `<b>${glossaryKey}</b>: ${getGlossaryDefinition(glossaryKey)}`;
  return <Tooltip text={tooltipText}>{children}</Tooltip>
}

export default GlossaryTooltip;