export default {
  paths: ['tests/bdd/features/**/*.feature'],
  import: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts'],
  format: ['progress-bar', 'html:tests/bdd/reports/report.html'],
  publishQuiet: true,
  forceExit: true,
}
