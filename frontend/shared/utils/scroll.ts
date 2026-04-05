export const scrollToSection = (sectionId: string, offset = 80) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({top: offsetPosition, behavior: 'smooth'});
};
