export default class SwadeTokenConfig extends TokenConfig {
    override async getData(options={}) {
        const data = await super.getData(options);
        const sourceSystem = this.actor?.system;
        if (!sourceSystem) return data;
        if (!data.barAttributes) return data;
        
        // Localize labels for normally found trackable attributes
        for (const currData of data.barAttributes) {
            const fullLabel = [];
            const splitPath = currData.label.split('.');
            for (let i = 1; i <= splitPath.length; i++) {
                let currSchema = sourceSystem.schema;
                for (const currPath of splitPath.slice(0, i)) {
                    currSchema = currSchema?.get?.(currPath);
                }
                if (currSchema?.label.length) fullLabel.push(game.i18n.localize(currSchema.label));
                else if (!currSchema) fullLabel.push(splitPath[i - 1])
                }
            if (fullLabel.length) currData.label = fullLabel.join(': ');
        }

        // Special handling for Additional Stats, Power Points, and Encumbrance
        for (const [key, value] of Object.entries(sourceSystem.additionalStats ?? {})) {
            if (value.dtype !== 'Number') continue;
            data.barAttributes.push({group: game.i18n.localize('SWADE.AddStats'), value: `additionalStats.${key}`, label: value.label});
        }
        for (const key of Object.keys(sourceSystem.powerPoints ?? {})) {
            data.barAttributes.push({group: game.i18n.localize('SWADE.PP'), value: `powerPoints.${key}`, label: key});
        }
        if (sourceSystem.details?.encumbrance?.max) data.barAttributes.push({group: game.i18n.localize('TOKEN.BarAttributes'), value: 'details.encumbrance', label: game.i18n.localize('SWADE.CarryWeight')})

        // Final sort
        data.barAttributes.sort((a, b) => (a.group === b.group) ? a.label.compare(b.label) : a.group.compare(b.group));
        return data;
    }
}