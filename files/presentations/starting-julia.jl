### A Pluto.jl notebook ###
# v0.12.18

using Markdown
using InteractiveUtils

# ╔═╡ 48c473fe-50d7-11eb-2ef7-8fb3e3afd0fd
using PlutoUI

# ╔═╡ 3733f64e-50d1-11eb-150f-a3bd124c5842
using Flux

# ╔═╡ 3aba755e-50d1-11eb-39e4-cd697000b4cc
using CUDA

# ╔═╡ 44bb862e-50d1-11eb-261c-5f2ce410036f
using MLDatasets

# ╔═╡ 55c8d48a-50d1-11eb-3831-95ed5ac78ba0
using Images

# ╔═╡ 5ce6f648-50d1-11eb-3764-05375eb16e0e
using Augmentor

# ╔═╡ 5e73c0a4-50d1-11eb-3841-5123719c1c2d
using Parameters

# ╔═╡ 62d57c8c-50d1-11eb-1384-91faa3ab0441
using IterTools

# ╔═╡ 67eb9954-50d1-11eb-19d5-f5533fc89f84
using OnlineStats

# ╔═╡ 6ba1c456-50d1-11eb-3559-49a0e3bae497
using Printf

# ╔═╡ 4e4a48ae-50d0-11eb-1f72-af3a4c8264de
md"""
# ResNet for CIFAR10 classification using Julia
"""

# ╔═╡ c4994938-50d3-11eb-2a65-6f4bcf3ff699
md"""
## Configuration
"""

# ╔═╡ 8601fc66-50d7-11eb-09ee-15051fad613a
TableOfContents()

# ╔═╡ 717721c8-50d1-11eb-1963-7d6db13f02fb
@with_kw struct Config
    batchsize::Int = 32
    throttle::Int = 20
    lr::Float32 = 1f-3
    epochs::Int = 2
end

# ╔═╡ 7a14711e-50d1-11eb-324c-3d363a55b29a
config = Config()

# ╔═╡ d6385514-50d1-11eb-2681-19eda9b81553
md"""
## Data
"""

# ╔═╡ e0b6f872-50e0-11eb-3aef-c7c465f0bbeb
md"""
One needs to download data only once
"""

# ╔═╡ 26d279ce-50e0-11eb-2f35-bfbc103e04b4
download_data = false

# ╔═╡ 49a1ab14-50db-11eb-1427-4140cfbbe2b4
if download_data
	CIFAR10.download(i_accept_the_terms_of_use=true)
end

# ╔═╡ 81824ec6-50d1-11eb-0193-9952efbd1d1a
train_data = CIFAR10.traindata(Float32);

# ╔═╡ 9adabcbe-50d1-11eb-1841-27374dc7a68e
test_data = CIFAR10.testdata(Float32);

# ╔═╡ bc3b84a4-50d1-11eb-1e34-8d7278d5b8b4
train_aug = FlipX(0.5) |> ShearX(-5:5) * ShearY(-5:5) |> Rotate(-15:15) |>
			CropSize(32,32) |> Zoom(0.9:0.1:1.2) |>
			SplitChannels() |> PermuteDims(3, 2, 1) |> ConvertEltype(Float32)

# ╔═╡ cef0c55c-50d1-11eb-3d1d-8d9f3cbe8fcd
function collate((imgs, labels))
    imgs = imgs |> gpu
    labels = Flux.onehotbatch(labels .+ 1, 1:10) |> gpu
    imgs, labels
end

# ╔═╡ ee18830c-50d1-11eb-2fb1-b9daf2194473
function collate((imgs, labels), aug)
    imgs_aug = Array{Float32}(undef, size(imgs))
    augmentbatch!(imgs_aug, CIFAR10.convert2image(imgs), aug)
    collate((imgs_aug, labels))
end

# ╔═╡ f56a618e-50d1-11eb-0f91-11659ef4b673
train_loader = imap(d -> collate(d, train_aug),
    Flux.Data.DataLoader(train_data, batchsize=config.batchsize, shuffle=true));

# ╔═╡ fcc44d50-50d1-11eb-0935-2f2fcc7dd57b
test_loader = imap(collate,
    Flux.Data.DataLoader(test_data, batchsize=config.batchsize, shuffle=false));

# ╔═╡ 0c9bb826-50d2-11eb-38ee-c1e8519c1e40
begin
	batch = iterate(train_loader)[1]
	CIFAR10.classnames()[Flux.onecold(cpu(batch[2])[:, 1], 1:10)],
	CIFAR10.convert2image(cpu(batch[1])[:,:,:, 1])
end

# ╔═╡ 1adb0360-50d2-11eb-04d8-43f534d2f297
md"""
## Model
"""

# ╔═╡ 9b25606a-50d2-11eb-100f-ef21928438bf
function conv_block(ch::Pair; kernel_size=3, stride=1, activation=relu)
    Chain(Conv((kernel_size, kernel_size), ch, pad=SamePad(), stride=stride,
				init=Flux.kaiming_normal),
          BatchNorm(ch.second, activation))
end

# ╔═╡ bcf1c238-50d2-11eb-164b-5382cf87aa21
function basic_residual(ch::Pair)
    Chain(conv_block(ch),
          conv_block(ch.second => ch.second, activation=identity))
end

# ╔═╡ c4840678-50d2-11eb-0789-7b7b8464444f
begin
	struct AddMerge
    	gamma
    	expand
	end
	
	Flux.@functor AddMerge
	
	function AddMerge(ch::Pair)
    	if ch.first == ch.second
        	expand = identity
    	else
        	expand = conv_block(ch, kernel_size=1, activation=identity)
    	end
    		AddMerge([0.f0], expand)
	end
	
	(m::AddMerge)(x1, x2) = relu.(m.gamma .* x1 .+ m.expand(x2))
end

# ╔═╡ deab49bc-50d2-11eb-3396-897c231e9828
function residual_block(ch::Pair)
    residual = basic_residual(ch)
    SkipConnection(residual, AddMerge(ch))
end

# ╔═╡ 35cdece0-50d3-11eb-1f98-3d672eceeab2
function residual_body(in_channels, repetitions, downsamplings)
    layers = []
    res_channels = in_channels
    for (rep, stride) in zip(repetitions, downsamplings)
        if stride > 1
            push!(layers, MaxPool((stride, stride)))
        end
        for i = 1:rep
            push!(layers, residual_block(in_channels => res_channels))
            in_channels = res_channels
        end
        res_channels *= 2
    end
    Chain(layers...)
end

# ╔═╡ 3d030ef0-50d3-11eb-391f-4f8ec4d542de
function stem(in_channels=3; channel_list = [32, 32, 64], stride=1)
    layers = []
    for channels in channel_list
        push!(layers, conv_block(in_channels => channels, stride=stride))
        in_channels = channels
        stride=1
    end
    Chain(layers...)
end

# ╔═╡ 4502f872-50d3-11eb-3214-a9c5ed590174
function head(in_channels, classes, p_drop=0.)
    Chain(GlobalMeanPool(),
          flatten,
          Dropout(p_drop),
          Dense(in_channels, classes))
end

# ╔═╡ 4a68eef2-50d3-11eb-0cfe-11de35e73bd0
function resnet(classes, repetitions, downsamplings; in_channels=3, p_drop=0.)
    Chain(stem(in_channels, stride=downsamplings[1]),
          residual_body(64, repetitions, downsamplings[1:end]),
          head(64 * 2^(length(repetitions)-1), classes, p_drop))
end

# ╔═╡ 4f7a133a-50d3-11eb-147c-df3750adfcd4
model = resnet(10, [2, 2, 2, 2], [1, 1, 2, 2, 2], p_drop=0.3) |> gpu

# ╔═╡ 587f1c96-50d3-11eb-225e-37b2fc13509d
md"""
## Training
"""

# ╔═╡ 6a6abd98-50d3-11eb-06cd-bb7b86c771c7
loss(x, y) = Flux.logitcrossentropy(model(x), y)

# ╔═╡ 718de15c-50d3-11eb-122e-fd5801d6b43d
ps = params(model);

# ╔═╡ 7715d51e-50d3-11eb-2c54-df5e1f9221c6
opt = Flux.Optimiser(InvDecay(0.001), ADAMW(config.lr, (0.9, 0.999), 1f-4))

# ╔═╡ 82df6976-50d3-11eb-27bd-91bd109eaefc
function accuracy(model, data)
    m = Mean()
    for (x, y) in data
        fit!(m, Flux.onecold(cpu(model(x)), 1:10) .== Flux.onecold(cpu(y), 1:10))
    end
    value(m)
end

# ╔═╡ 949a13de-50d3-11eb-3ce7-7ddf19c38ec9
evalcb = Flux.throttle(config.throttle) do
    @printf "Val accuracy: %.3f\n" accuracy(model, test_loader)
end

# ╔═╡ 04d07450-50e0-11eb-39ef-c3932258b60d
do_training = false

# ╔═╡ 9bdeb4d8-50d3-11eb-3436-6fc220314724
if do_training
	Flux.@epochs config.epochs Flux.train!(loss, ps, train_loader, opt, cb=evalcb)
end

# ╔═╡ Cell order:
# ╟─4e4a48ae-50d0-11eb-1f72-af3a4c8264de
# ╟─c4994938-50d3-11eb-2a65-6f4bcf3ff699
# ╠═48c473fe-50d7-11eb-2ef7-8fb3e3afd0fd
# ╠═8601fc66-50d7-11eb-09ee-15051fad613a
# ╠═3733f64e-50d1-11eb-150f-a3bd124c5842
# ╠═3aba755e-50d1-11eb-39e4-cd697000b4cc
# ╠═44bb862e-50d1-11eb-261c-5f2ce410036f
# ╠═55c8d48a-50d1-11eb-3831-95ed5ac78ba0
# ╠═5ce6f648-50d1-11eb-3764-05375eb16e0e
# ╠═5e73c0a4-50d1-11eb-3841-5123719c1c2d
# ╠═62d57c8c-50d1-11eb-1384-91faa3ab0441
# ╠═67eb9954-50d1-11eb-19d5-f5533fc89f84
# ╠═6ba1c456-50d1-11eb-3559-49a0e3bae497
# ╠═717721c8-50d1-11eb-1963-7d6db13f02fb
# ╠═7a14711e-50d1-11eb-324c-3d363a55b29a
# ╟─d6385514-50d1-11eb-2681-19eda9b81553
# ╟─e0b6f872-50e0-11eb-3aef-c7c465f0bbeb
# ╠═26d279ce-50e0-11eb-2f35-bfbc103e04b4
# ╠═49a1ab14-50db-11eb-1427-4140cfbbe2b4
# ╠═81824ec6-50d1-11eb-0193-9952efbd1d1a
# ╠═9adabcbe-50d1-11eb-1841-27374dc7a68e
# ╠═bc3b84a4-50d1-11eb-1e34-8d7278d5b8b4
# ╠═cef0c55c-50d1-11eb-3d1d-8d9f3cbe8fcd
# ╠═ee18830c-50d1-11eb-2fb1-b9daf2194473
# ╠═f56a618e-50d1-11eb-0f91-11659ef4b673
# ╠═fcc44d50-50d1-11eb-0935-2f2fcc7dd57b
# ╠═0c9bb826-50d2-11eb-38ee-c1e8519c1e40
# ╟─1adb0360-50d2-11eb-04d8-43f534d2f297
# ╠═9b25606a-50d2-11eb-100f-ef21928438bf
# ╠═bcf1c238-50d2-11eb-164b-5382cf87aa21
# ╠═c4840678-50d2-11eb-0789-7b7b8464444f
# ╠═deab49bc-50d2-11eb-3396-897c231e9828
# ╠═35cdece0-50d3-11eb-1f98-3d672eceeab2
# ╠═3d030ef0-50d3-11eb-391f-4f8ec4d542de
# ╠═4502f872-50d3-11eb-3214-a9c5ed590174
# ╠═4a68eef2-50d3-11eb-0cfe-11de35e73bd0
# ╠═4f7a133a-50d3-11eb-147c-df3750adfcd4
# ╟─587f1c96-50d3-11eb-225e-37b2fc13509d
# ╠═6a6abd98-50d3-11eb-06cd-bb7b86c771c7
# ╠═718de15c-50d3-11eb-122e-fd5801d6b43d
# ╠═7715d51e-50d3-11eb-2c54-df5e1f9221c6
# ╠═82df6976-50d3-11eb-27bd-91bd109eaefc
# ╠═949a13de-50d3-11eb-3ce7-7ddf19c38ec9
# ╠═04d07450-50e0-11eb-39ef-c3932258b60d
# ╠═9bdeb4d8-50d3-11eb-3436-6fc220314724
