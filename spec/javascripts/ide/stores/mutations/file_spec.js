import mutations from '~/ide/stores/mutations/file';
import state from '~/ide/stores/state';
import { file } from '../../helpers';

describe('Multi-file store file mutations', () => {
  let localState;
  let localFile;

  beforeEach(() => {
    localState = state();
    localFile = file();

    localState.entries[localFile.path] = localFile;
  });

  describe('SET_FILE_ACTIVE', () => {
    it('sets the file active', () => {
      mutations.SET_FILE_ACTIVE(localState, {
        path: localFile.path,
        active: true,
      });

      expect(localFile.active).toBeTruthy();
    });
  });

  describe('TOGGLE_FILE_OPEN', () => {
    beforeEach(() => {
      mutations.TOGGLE_FILE_OPEN(localState, localFile.path);
    });

    it('adds into opened files', () => {
      expect(localFile.opened).toBeTruthy();
      expect(localState.openFiles.length).toBe(1);
    });

    it('removes from opened files', () => {
      mutations.TOGGLE_FILE_OPEN(localState, localFile.path);

      expect(localFile.opened).toBeFalsy();
      expect(localState.openFiles.length).toBe(0);
    });
  });

  describe('SET_FILE_DATA', () => {
    it('sets extra file data', () => {
      mutations.SET_FILE_DATA(localState, {
        data: {
          blame_path: 'blame',
          commits_path: 'commits',
          permalink: 'permalink',
          raw_path: 'raw',
          binary: true,
          render_error: 'render_error',
        },
        file: localFile,
      });

      expect(localFile.blamePath).toBe('blame');
      expect(localFile.commitsPath).toBe('commits');
      expect(localFile.permalink).toBe('permalink');
      expect(localFile.rawPath).toBe('raw');
      expect(localFile.binary).toBeTruthy();
      expect(localFile.renderError).toBe('render_error');
    });
  });

  describe('SET_FILE_RAW_DATA', () => {
    it('sets raw data', () => {
      mutations.SET_FILE_RAW_DATA(localState, {
        file: localFile,
        raw: 'testing',
      });

      expect(localFile.raw).toBe('testing');
    });
  });

  describe('UPDATE_FILE_CONTENT', () => {
    beforeEach(() => {
      localFile.raw = 'test';
    });

    it('sets content', () => {
      mutations.UPDATE_FILE_CONTENT(localState, {
        path: localFile.path,
        content: 'test',
      });

      expect(localFile.content).toBe('test');
    });

    it('sets changed if content does not match raw', () => {
      mutations.UPDATE_FILE_CONTENT(localState, {
        path: localFile.path,
        content: 'testing',
      });

      expect(localFile.content).toBe('testing');
      expect(localFile.changed).toBeTruthy();
    });

    it('sets changed if file is a temp file', () => {
      localFile.tempFile = true;

      mutations.UPDATE_FILE_CONTENT(localState, {
        path: localFile.path,
        content: '',
      });

      expect(localFile.changed).toBeTruthy();
    });
  });

  describe('DISCARD_FILE_CHANGES', () => {
    beforeEach(() => {
      localFile.content = 'test';
      localFile.changed = true;
    });

    it('resets content and changed', () => {
      mutations.DISCARD_FILE_CHANGES(localState, localFile.path);

      expect(localFile.content).toBe('');
      expect(localFile.changed).toBeFalsy();
    });
  });

  describe('ADD_FILE_TO_CHANGED', () => {
    it('adds file into changed files array', () => {
      mutations.ADD_FILE_TO_CHANGED(localState, localFile.path);

      expect(localState.changedFiles.length).toBe(1);
    });
  });

  describe('REMOVE_FILE_FROM_CHANGED', () => {
    it('removes files from changed files array', () => {
      localState.changedFiles.push(localFile);

      mutations.REMOVE_FILE_FROM_CHANGED(localState, localFile.path);

      expect(localState.changedFiles.length).toBe(0);
    });
  });

  describe('TOGGLE_FILE_CHANGED', () => {
    it('updates file changed status', () => {
      mutations.TOGGLE_FILE_CHANGED(localState, {
        file: localFile,
        changed: true,
      });

      expect(localFile.changed).toBeTruthy();
    });
  });
});
