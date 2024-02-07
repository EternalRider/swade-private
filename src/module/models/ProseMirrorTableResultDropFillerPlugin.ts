import { EditorView } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/prosemirror/prosemirror.mjs';

/** This plugin is used when dropping a TableResult onto a editor to give the user a choice between
 * creating a content link or instead grabbing the TableResult and inserting the content.
 */
export class ProseMirrorTableResultDropFillerPlugin extends ProseMirror.ProseMirrorPlugin {
  static override build(schema, options = {}) {
    const plugin = new ProseMirrorTableResultDropFillerPlugin(schema, options);
    return new ProseMirror.Plugin({
      props: { handleDrop: plugin._onDrop.bind(plugin) },
    });
  }

  declare schema: any;

  _onDrop(view: EditorView, event: DragEvent, _slice, moved: boolean) {
    //Bail early if the slice has just been moved
    if (moved) return;
    // Get the drag data.
    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
    const data = TextEditor.getDragEventData(event) as {
      type: string;
      uuid: string;
    };
    if (!data.type) return;
    fromUuid(data.uuid).then((doc) => {
      if (
        doc instanceof TableResult &&
        doc.type === CONST.TABLE_RESULT_TYPES.TEXT
      ) {
        this.#handleFill(view, doc, pos);
      } else {
        this.#handleCreateContentLink(view, data, pos);
      }
    });
    // Return true to indicate the drop event should be consumed.
    event.stopPropagation();
    return true;
  }

  async #handleCreateContentLink(view: EditorView, data: any, pos: Position) {
    const options: Record<string, unknown> = {};
    const selection = view.state.selection;
    if (!selection.empty) {
      const content = selection.content().content;
      options.label = content.textBetween(0, content.size);
    }
    const link = await TextEditor.getContentLink(data, options);
    if (!link) return;
    const tr = view.state.tr;
    console.log(this.schema.text);
    if (selection.empty && pos) tr.insertText(link, pos.pos);
    else tr.replaceSelectionWith(this.schema.text(link));
    view.dispatch(tr);
    // Focusing immediately only seems to work in Chrome. In Firefox we must yield execution before attempting to
    // focus, otherwise the cursor becomes invisible until the user manually unfocuses and refocuses.
    setTimeout(view.focus.bind(view), 0);
  }

  async #handleFill(view: EditorView, result: TableResult, pos: Position) {
    const textRaw = result.text;
    const selection = view.state.selection;
    if (!selection.empty) {
      const content = selection.content().content;
      content.textBetween(0, content.size);
    }
    const tr = view.state.tr;
    const newNodes = this.#transformText(textRaw);
    const firstNode = view.state.doc.content.child(0);
    if (firstNode.type.name === 'paragraph' && firstNode.content.size < 1) {
      tr.delete(0, 0);
      tr.insert(0, newNodes);
    } else if (selection.empty && pos) {
      tr.insert(pos.pos, newNodes);
    } else {
      tr.replaceSelectionWith(newNodes);
    }
    view.dispatch(tr);
    // Focusing immediately only seems to work in Chrome. In Firefox we must yield execution before attempting to
    // focus, otherwise the cursor becomes invisible until the user manually unfocuses and refocuses.
    setTimeout(view.focus.bind(view), 0);
  }

  #transformText(text: string) {
    return ProseMirror.dom.parseString(text, this.schema);
  }
}

type Position = ReturnType<EditorView['posAtCoords']>;
