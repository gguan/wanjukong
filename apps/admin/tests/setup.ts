import { config } from '@vue/test-utils';

config.global.stubs = {
  NuxtLink: {
    template: '<a><slot /></a>',
  },
  // Stub Element Plus components for unit tests
  ElMenu: { template: '<nav><slot /></nav>' },
  ElMenuItem: { template: '<div class="el-menu-item"><slot /></div>', props: ['index'] },
  ElTag: { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
  ElButton: { template: '<button class="el-button"><slot /></button>', props: ['type', 'size'] },
  ElAside: { template: '<aside><slot /></aside>', props: ['width'] },
};
