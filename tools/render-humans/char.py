"""Builds a clothed, rigged MakeHuman character (MPFB add-on, CC0 assets) in Blender."""
import sys, os
import bpy, addon_utils

MPFB_SRC = os.environ.get('MPFB_SRC', '')

def load_mpfb():
    ext = bpy.utils.user_resource('EXTENSIONS', path='user_default')
    os.makedirs(ext, exist_ok=True)
    link = os.path.join(ext, 'mpfb')
    if not os.path.exists(link):
        os.symlink(MPFB_SRC, link)
    if 'bl_ext.user_default.mpfb' not in sys.modules:
        addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    from bl_ext.user_default.mpfb.services.assetservice import AssetService
    from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties
    return HumanService, TargetService, AssetService, HumanObjectProperties

LOOK = {
    'male': dict(macro=dict(gender=1.0, muscle=0.75, weight=0.5, height=0.55, age=0.5, african=0.3, asian=0.2, caucasian=0.5),
                 skin='young_caucasian_male.mhmat', brows='eyebrow001.mhclo', hair='short02.mhclo',
                 clothes=['male_casualsuit06.mhclo', 'shoes05.mhclo']),
    'female': dict(macro=dict(gender=0.0, muscle=0.62, weight=0.45, height=0.5, age=0.45, african=0.3, asian=0.2, caucasian=0.5),
                   skin='young_caucasian_female.mhmat', brows='eyebrow001.mhclo', hair='ponytail01.mhclo',
                   clothes=['female_sportsuit01.mhclo', 'shoes05.mhclo']),
}

def warm_skin(obj, value=0.78, sat=1.12):
    """A warmer, slightly deeper skin tone than the default texture."""
    for slot in obj.material_slots:
        m = slot.material
        if not m or not m.node_tree:
            continue
        nt = m.node_tree
        for link in list(nt.links):
            if link.from_node.type == 'TEX_IMAGE' and link.from_socket.name == 'Color' and link.to_socket.name in ('Base Color', 'Color'):
                hsv = nt.nodes.new('ShaderNodeHueSaturation')
                hsv.inputs['Value'].default_value = value
                hsv.inputs['Saturation'].default_value = sat
                hsv.inputs['Hue'].default_value = 0.49
                nt.links.new(link.from_socket, hsv.inputs['Color'])
                nt.links.new(hsv.outputs['Color'], link.to_socket)

def build(sex: str):
    HumanService, TargetService, AssetService, HOP = load_mpfb()
    L = LOOK[sex]
    body = HumanService.create_human()
    for k, v in L['macro'].items():
        HOP.set_value(k, v, entity_reference=body)
    TargetService.reapply_macro_details(body)
    rig = HumanService.add_builtin_rig(body, 'game_engine')
    HumanService.set_character_skin(AssetService.find_asset_absolute_path(L['skin'], asset_subdir='skins'), body, skin_type='MAKESKIN')
    warm_skin(body)
    parts = [('eyes', 'low-poly.mhclo', 'Eyes'), ('eyebrows', L['brows'], 'Eyebrows'),
             ('eyelashes', 'eyelashes01.mhclo', 'Eyelashes'), ('hair', L['hair'], 'Hair')]
    parts += [('clothes', c, 'Clothes') for c in L['clothes']]
    for subdir, fname, atype in parts:
        p = AssetService.find_asset_absolute_path(fname, asset_subdir=subdir)
        if p is None:
            print('MISSING', subdir, fname)
            continue
        HumanService.add_mhclo_asset(p, body, asset_type=atype, subdiv_levels=1 if atype in ('Clothes', 'Hair') else 0)
    return body, rig
